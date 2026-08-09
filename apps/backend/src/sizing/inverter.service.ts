import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { InverterSizingDto } from "./dto/sizing.dto";
import { getLatestCalculationOrThrow } from "./latest-calculation.helper";

@Injectable()
export class InverterSizingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  async calculate(projectId: string, dto: InverterSizingDto) {
    let peakRunningW = dto.peakRunningW;
    let peakSurgeW = dto.peakSurgeW;
    if (peakRunningW == null || peakSurgeW == null) {
      const latest = await getLatestCalculationOrThrow(this.prisma, projectId);
      peakRunningW = peakRunningW ?? latest.peakWatts ?? 0;
      peakSurgeW = peakSurgeW ?? latest.surgeWatts ?? peakRunningW;
    }

    const result = this.engine.inverter.calculateInverterSizing({
      peakRunningW,
      peakSurgeW,
      powerFactor: dto.powerFactor,
      safetyMarginPct: dto.safetyMargin,
      candidateInverterVA: dto.candidateInverterVA,
    });

    return this.prisma.inverterCalculation.create({
      data: {
        projectId,
        peakRunningW: result.peakRunningW,
        peakSurgeW: result.peakSurgeW,
        powerFactor: result.powerFactor,
        safetyMarginPct: result.safetyMarginPct,
        minInverterVA: result.minInverterVA,
        recommendedInverterVA: result.recommendedInverterVA,
        recommendedKva: result.recommendedKva,
        requiredSurgeVA: result.requiredSurgeVA,
        utilizationPct: result.utilizationPct,
        isUndersized: result.isUndersized,
      },
    });
  }

  latest(projectId: string) {
    return this.prisma.inverterCalculation.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  list(projectId: string) {
    return this.prisma.inverterCalculation.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
