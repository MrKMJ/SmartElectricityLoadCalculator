import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { EnergyAnalysisApplianceInput } from "../common/calculation-engine/energy-analysis.engine";

@Injectable()
export class EnergyAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  async analyze(projectId: string) {
    const appliances = await this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null, isActive: true },
    });

    const inputs: EnergyAnalysisApplianceInput[] = appliances.map((a) => {
      const dailyKwh = (a.ratedWatts * a.quantity * a.hoursPerDay) / 1000;
      return {
        id: a.id,
        name: a.name,
        category: a.category,
        quantity: a.quantity,
        ratedWatts: a.ratedWatts,
        hoursPerDay: a.hoursPerDay,
        daysPerMonth: a.daysPerMonth,
        monthlyKwh: dailyKwh * a.daysPerMonth,
      };
    });

    const rate = await this.estimateEffectiveRate(projectId);
    return this.engine.energyAnalysis.analyzeEnergyUsage(inputs, rate ?? undefined);
  }

  async savings(projectId: string) {
    const result = await this.analyze(projectId);
    return {
      suggestions: result.suggestions,
      potentialMonthlySavingsKwh: result.potentialMonthlySavingsKwh,
      potentialAnnualSavingsKwh: result.potentialAnnualSavingsKwh,
      efficiencyScore: result.efficiencyScore,
    };
  }

  /**
   * What-If savings simulation: given a set of appliance IDs the user is
   * considering replacing, project the new total monthly consumption and
   * (if a tariff is selected) the new estimated bill — without persisting
   * anything, mirroring the Scenario engine's "look before you leap" model.
   */
  async simulate(projectId: string, applianceIds: string[]) {
    const analysis = await this.analyze(projectId);
    const applying = analysis.suggestions.filter((s) => applianceIds.includes(s.applianceId ?? ""));

    const currentMonthlyKwh = analysis.totalMonthlyKwh;
    const savedKwh = applying.reduce((sum, s) => sum + s.estimatedMonthlySavingsKwh, 0);
    const projectedMonthlyKwh = Math.max(0, currentMonthlyKwh - savedKwh);

    const projectTariff = await this.prisma.projectTariff.findUnique({
      where: { projectId },
      include: { tariff: { include: { slabs: true } } },
    });

    let currentBill: number | null = null;
    let projectedBill: number | null = null;
    if (projectTariff) {
      const slabs = projectTariff.tariff.slabs.map((s) => ({
        minKwh: s.minKwh,
        maxKwh: s.maxKwh,
        ratePerKwh: s.ratePerKwh,
        fixedCharge: s.fixedCharge,
        taxRatePct: s.taxRatePct,
      }));
      currentBill = this.engine.bill.calculateBill(currentMonthlyKwh, slabs).calculatedAmount;
      projectedBill = this.engine.bill.calculateBill(projectedMonthlyKwh, slabs).calculatedAmount;
    }

    return {
      appliedSuggestions: applying,
      currentMonthlyKwh: round(currentMonthlyKwh),
      projectedMonthlyKwh: round(projectedMonthlyKwh),
      monthlyKwhSaved: round(savedKwh),
      currentBill,
      projectedBill,
      billSavings: currentBill != null && projectedBill != null ? round(currentBill - projectedBill) : null,
    };
  }

  private async estimateEffectiveRate(projectId: string): Promise<number | null> {
    const latestBill = await this.prisma.bill.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
    if (latestBill && latestBill.inputKwh > 0) {
      return latestBill.calculatedAmount / latestBill.inputKwh;
    }
    const projectTariff = await this.prisma.projectTariff.findUnique({
      where: { projectId },
      include: { tariff: { include: { slabs: { orderBy: { minKwh: "asc" } } } } },
    });
    return projectTariff?.tariff.slabs[0]?.ratePerKwh ?? null;
  }
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
