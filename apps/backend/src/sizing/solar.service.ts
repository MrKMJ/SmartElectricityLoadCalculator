import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SolarIntegrationService } from "../integrations/solar/solar-integration.service";
import { SolarSizingDto } from "./dto/sizing.dto";
import { getLatestCalculationOrThrow } from "./latest-calculation.helper";

@Injectable()
export class SolarSizingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly solarIntegration: SolarIntegrationService,
  ) {}

  async calculate(projectId: string, dto: SolarSizingDto) {
    let dailyKwh = dto.dailyKwh;
    if (dailyKwh == null) {
      const latest = await getLatestCalculationOrThrow(this.prisma, projectId);
      dailyKwh = latest.dailyKwh ?? 0;
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });

    const result = await this.solarIntegration.size({
      dailyKwh,
      peakSunHours: dto.peakSunHours,
      systemEfficiencyPct: dto.systemEfficiencyPct,
      panelWattage: dto.panelWattage,
      desiredCoveragePct: dto.desiredCoveragePct,
      electricityRatePerKwh: dto.electricityRatePerKwh,
      systemCostPerKw: dto.systemCostPerKw,
      latitude: project?.latitude ?? undefined,
      longitude: project?.longitude ?? undefined,
    });

    return this.prisma.solarCalculation.create({
      data: {
        projectId,
        dailyKwh: result.dailyKwh,
        peakSunHours: result.peakSunHours,
        systemEfficiencyPct: result.systemEfficiencyPct,
        panelWattage: result.panelWattage,
        desiredCoveragePct: result.desiredCoveragePct,
        requiredKw: result.requiredKw,
        panelQuantity: result.panelQuantity,
        estimatedDailyGenKwh: result.estimatedDailyGenKwh,
        estimatedMonthlyGenKwh: result.estimatedMonthlyGenKwh,
        actualCoveragePct: result.actualCoveragePct,
        estimatedMonthlySavings: result.estimatedMonthlySavings,
        paybackYears: result.paybackYears,
        dataSource: result.dataSource,
        rawProviderResponse: result.rawProviderResponse as any,
      },
    });
  }

  latest(projectId: string) {
    return this.prisma.solarCalculation.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  list(projectId: string) {
    return this.prisma.solarCalculation.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
