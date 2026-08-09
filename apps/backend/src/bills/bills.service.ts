import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { AuditService } from "../audit/audit.service";
import { CalculateBillDto } from "./dto/calculate-bill.dto";

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
    private readonly audit: AuditService,
  ) {}

  async calculate(userId: string, projectId: string, dto: CalculateBillDto) {
    const projectTariff = await this.prisma.projectTariff.findUnique({
      where: { projectId },
      include: { tariff: { include: { slabs: true } } },
    });
    if (!projectTariff) {
      throw new BadRequestException(
        "This project has no tariff selected yet. Choose one via POST /projects/:projectId/tariff.",
      );
    }

    let monthlyKwh = dto.monthlyKwh;
    if (monthlyKwh == null) {
      const latest = await this.prisma.calculation.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) {
        throw new BadRequestException(
          "No calculation exists yet for this project. Run POST /projects/:projectId/calculations first, or pass monthlyKwh explicitly.",
        );
      }
      monthlyKwh = latest.monthlyKwh ?? 0;
    }

    const result = this.engine.bill.calculateBill(
      monthlyKwh,
      projectTariff.tariff.slabs.map((s) => ({
        minKwh: s.minKwh,
        maxKwh: s.maxKwh,
        ratePerKwh: s.ratePerKwh,
        fixedCharge: s.fixedCharge,
        taxRatePct: s.taxRatePct,
      })),
    );

    // Historical snapshot: even if the tariff changes later, this bill
    // remains reproducible (Architecture.docx §15/§17 in the DB doc).
    const bill = await this.prisma.bill.create({
      data: {
        projectId,
        tariffId: projectTariff.tariffId,
        tariffVersion: projectTariff.tariff.version,
        tariffSnapshot: projectTariff.tariff as any,
        inputKwh: monthlyKwh,
        energyCharge: result.energyCharge,
        fixedCharges: result.fixedCharges,
        taxes: result.taxes,
        calculatedAmount: result.calculatedAmount,
      },
    });

    await this.audit.log({ userId, action: "BILL_CALCULATED", resourceType: "bill", resourceId: bill.id });

    return { bill, breakdown: result.slabBreakdown };
  }

  list(projectId: string) {
    return this.prisma.bill.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 24 });
  }

  async findOne(userId: string, billId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException("Bill not found.");
    await this.assertProjectAccess(userId, bill.projectId);
    return bill;
  }

  private async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException("Bill not found.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (project.ownerId !== userId && project.members.length === 0 && !isAdmin) {
      throw new NotFoundException("Bill not found.");
    }
  }
}
