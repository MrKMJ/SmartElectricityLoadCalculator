import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { LoadEngineApplianceInput } from "../common/calculation-engine/types";
import { AuditService } from "../audit/audit.service";
import { RunCalculationDto } from "./dto/run-calculation.dto";

@Injectable()
export class CalculationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
    private readonly audit: AuditService,
  ) {}

  /**
   * The standard calculation workflow (Architecture.docx §31):
   * load appliances -> validate/normalize -> connected/running/surge load ->
   * usage timeline -> peak demand -> daily/monthly kWh -> apply tariff ->
   * bill -> safety checks -> recommendations -> persist + return.
   */
  async run(userId: string, projectId: string, dto: RunCalculationDto) {
    const appliances = await this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null, isActive: true },
    });

    const engineInputs: LoadEngineApplianceInput[] = appliances.map((a) => ({
      id: a.id,
      name: a.name,
      quantity: a.quantity,
      ratedWatts: a.ratedWatts,
      surgeWatts: a.surgeWatts,
      voltage: a.voltage,
      powerFactor: a.powerFactor,
      hoursPerDay: a.hoursPerDay,
      daysPerMonth: a.daysPerMonth,
      startTime: a.startTime ?? undefined,
      priority: a.priority as any,
    }));

    const safetyMargin = dto.safetyMargin ?? 20;
    const summary = this.engine.load.calculateLoadSummary(engineInputs);
    const peak = this.engine.peakLoad.buildPeakLoadTimeline(engineInputs);

    const bill = await this.tryCalculateBill(projectId, summary.monthlyKwh);

    const inputsSnapshot = { appliances: engineInputs, safetyMargin, type: dto.type ?? "FULL" };
    const inputHash = this.engine.hashInputs(inputsSnapshot);

    const calculation = await this.prisma.calculation.create({
      data: {
        projectId,
        type: (dto.type as any) ?? "FULL",
        status: "COMPLETED",
        engineVersion: this.engine.engineVersion,
        formulaVersion: this.engine.formulaVersion,
        inputHash,
        inputsSnapshot: inputsSnapshot as any,
        safetyMarginPct: safetyMargin,
        connectedWatts: summary.connectedWatts,
        runningWatts: summary.runningWatts,
        peakWatts: peak.peakRunningWatts,
        surgeWatts: peak.peakSurgeWatts,
        dailyKwh: summary.dailyKwh,
        monthlyKwh: summary.monthlyKwh,
        annualKwh: summary.annualKwh,
        estimatedBill: bill?.calculatedAmount ?? null,
        completedAt: new Date(),
        items: {
          create: summary.items.map((item) => ({
            projectApplianceId: item.applianceId,
            name: item.name,
            quantity: item.quantity,
            runningWatts: item.runningWatts,
            surgeWatts: item.surgeWatts,
            hoursPerDay: item.hoursPerDay,
            dailyKwh: item.dailyKwh,
            monthlyKwh: item.monthlyKwh,
          })),
        },
      },
      include: { items: true },
    });

    const loadAnalysis = await this.prisma.loadAnalysis.create({
      data: {
        projectId,
        calculationId: calculation.id,
        peakRunningWatts: peak.peakRunningWatts,
        peakSurgeWatts: peak.peakSurgeWatts,
        peakTime: peak.peakTime,
        timeline: peak.timeline as any,
      },
    });

    const recommendations = this.engine.recommendation.generateRecommendations({
      peakRunningWatts: peak.peakRunningWatts,
      peakSurgeWatts: peak.peakSurgeWatts,
      monthlyKwh: summary.monthlyKwh,
      items: summary.items,
    });
    if (recommendations.length > 0) {
      await this.prisma.recommendation.createMany({
        data: recommendations.map((r) => ({
          projectId,
          type: r.type,
          severity: r.severity as any,
          message: r.message,
          meta: r.meta as any,
        })),
      });
    }

    await this.audit.log({
      userId,
      action: "CALCULATION_CREATED",
      resourceType: "calculation",
      resourceId: calculation.id,
    });

    return { calculation, peak, contributors: peak.contributors, bill, loadAnalysisId: loadAnalysis.id };
  }

  list(projectId: string) {
    return this.prisma.calculation.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findOne(userId: string, calculationId: string) {
    const calc = await this.prisma.calculation.findUnique({
      where: { id: calculationId },
      include: { items: true, loadAnalyses: true, project: true },
    });
    if (!calc) throw new NotFoundException("Calculation not found.");
    await this.assertProjectAccess(userId, calc.projectId);
    return calc;
  }

  async remove(userId: string, calculationId: string) {
    await this.findOne(userId, calculationId);
    await this.prisma.calculation.delete({ where: { id: calculationId } });
    return { deleted: true };
  }

  // Mirrors ProjectAccessGuard's rule for routes that only carry a
  // calculationId (no :projectId segment to run the guard against).
  private async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException("Project not found.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (project.ownerId !== userId && project.members.length === 0 && !isAdmin) {
      throw new NotFoundException("Calculation not found.");
    }
  }

  private async tryCalculateBill(projectId: string, monthlyKwh: number) {
    const projectTariff = await this.prisma.projectTariff.findUnique({
      where: { projectId },
      include: { tariff: { include: { slabs: true } } },
    });
    if (!projectTariff) return null;

    return this.engine.bill.calculateBill(
      monthlyKwh,
      projectTariff.tariff.slabs.map((s) => ({
        minKwh: s.minKwh,
        maxKwh: s.maxKwh,
        ratePerKwh: s.ratePerKwh,
        fixedCharge: s.fixedCharge,
        taxRatePct: s.taxRatePct,
      })),
    );
  }
}
