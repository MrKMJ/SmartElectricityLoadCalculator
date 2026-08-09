import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generateProjectReportPdf } from "./report-pdf.generator";
import { generateQuotationPdf, QuotationLineItem } from "./quotation-pdf.generator";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";

/**
 * The actual PDF-generation work (Architecture.docx §35 Report Workflow),
 * invoked only by the background worker (jobs/worker.main.ts) — never
 * directly from an API request, so it can never block one.
 */
@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly engine: CalculationEngineService,
  ) {}

  async generate(reportId: string): Promise<void> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      this.logger.warn(`Report ${reportId} no longer exists; skipping.`);
      return;
    }

    await this.prisma.report.update({ where: { id: reportId }, data: { status: "PROCESSING" } });

    try {
      const [project, appliances, latestCalc, inverter, battery, solar, generator, recommendations, creator] =
        await Promise.all([
          this.prisma.project.findUniqueOrThrow({ where: { id: report.projectId } }),
          this.prisma.projectAppliance.findMany({ where: { projectId: report.projectId, deletedAt: null } }),
          this.prisma.calculation.findFirst({ where: { projectId: report.projectId }, orderBy: { createdAt: "desc" } }),
          this.prisma.inverterCalculation.findFirst({ where: { projectId: report.projectId }, orderBy: { createdAt: "desc" } }),
          this.prisma.batteryCalculation.findFirst({ where: { projectId: report.projectId }, orderBy: { createdAt: "desc" } }),
          this.prisma.solarCalculation.findFirst({ where: { projectId: report.projectId }, orderBy: { createdAt: "desc" } }),
          this.prisma.generatorCalculation.findFirst({ where: { projectId: report.projectId }, orderBy: { createdAt: "desc" } }),
          this.prisma.recommendation.findMany({ where: { projectId: report.projectId, resolvedAt: null }, take: 20 }),
          this.prisma.user.findUnique({ where: { id: report.createdById }, include: { preference: true } }),
        ]);

      const pdfBuffer =
        report.type === "QUOTATION"
          ? await generateQuotationPdf({
              projectName: project.name,
              generatedAt: new Date(),
              currency: project.currency,
              branding: {
                companyName: creator?.preference?.companyName,
                brandColorHex: creator?.preference?.brandColorHex,
                logoDataUrl: creator?.preference?.logoDataUrl,
              },
              preparedBy: { name: creator?.name ?? "—", email: creator?.email ?? "—" },
              systemSummary: {
                peakWatts: latestCalc?.peakWatts,
                monthlyKwh: latestCalc?.monthlyKwh,
                inverterKva: inverter?.recommendedKva,
                batteryAh: battery?.requiredAh,
                solarKw: solar?.requiredKw,
                generatorKva: generator?.recommendedKva,
              },
              lineItems: ((report.lineItems as unknown as QuotationLineItem[]) ?? []).map((item) => ({
                label: item.label,
                description: item.description,
                unitCost: Number(item.unitCost) || 0,
                quantity: Number(item.quantity) || 0,
              })),
            })
          : await generateProjectReportPdf({
              projectName: project.name,
              generatedAt: new Date(),
              appliances: appliances.map((a) => ({
                name: a.name,
                quantity: a.quantity,
                ratedWatts: a.ratedWatts,
                hoursPerDay: a.hoursPerDay,
              })),
              connectedWatts: latestCalc?.connectedWatts,
              runningWatts: latestCalc?.runningWatts,
              peakWatts: latestCalc?.peakWatts,
              surgeWatts: latestCalc?.surgeWatts,
              dailyKwh: latestCalc?.dailyKwh,
              monthlyKwh: latestCalc?.monthlyKwh,
              annualKwh: latestCalc?.annualKwh,
              estimatedBill: latestCalc?.estimatedBill,
              currency: project.currency,
              inverter,
              battery,
              solar,
              generator,
              recommendations: recommendations.map((r) => ({ severity: r.severity, message: r.message })),
            });

      const storageKey = `reports/${report.projectId}/${report.id}.pdf`;
      await this.storage.upload(storageKey, pdfBuffer, "application/pdf");

      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: "COMPLETED",
          storageKey,
          engineVersion: this.engine.engineVersion,
          completedAt: new Date(),
        },
      });

      await this.notifications.create(
        report.createdById,
        "REPORT_READY",
        "Your report is ready",
        `The report for "${project.name}" has finished generating.`,
        { reportId: report.id },
      );
    } catch (error) {
      this.logger.error(`Report ${reportId} generation failed: ${(error as Error).message}`, (error as Error).stack);
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: "FAILED", failureReason: (error as Error).message },
      });
    }
  }
}
