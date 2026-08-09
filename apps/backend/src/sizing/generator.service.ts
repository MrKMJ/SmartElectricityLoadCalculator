import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { GeneratorSizingDto } from "./dto/sizing.dto";
import { getLatestCalculationOrThrow } from "./latest-calculation.helper";

@Injectable()
export class GeneratorSizingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  async calculate(projectId: string, dto: GeneratorSizingDto) {
    let runningLoadW = dto.runningLoadW;
    let startingLoadW = dto.startingLoadW;
    if (runningLoadW == null || startingLoadW == null) {
      const latest = await getLatestCalculationOrThrow(this.prisma, projectId);
      runningLoadW = runningLoadW ?? latest.runningWatts ?? 0;
      startingLoadW = startingLoadW ?? Math.max(0, (latest.surgeWatts ?? 0) - (latest.runningWatts ?? 0));
    }

    const result = this.engine.generator.calculateGeneratorSizing({
      runningLoadW,
      startingLoadW,
      powerFactor: dto.powerFactor,
      safetyMarginPct: dto.safetyMargin,
    });

    return this.prisma.generatorCalculation.create({
      data: {
        projectId,
        runningLoadW: result.runningLoadW,
        startingLoadW: result.startingLoadW,
        powerFactor: result.powerFactor,
        safetyMarginPct: result.safetyMarginPct,
        minKva: result.minKva,
        recommendedKva: result.recommendedKva,
        estimatedUtilizationPct: result.estimatedUtilizationPct,
      },
    });
  }

  latest(projectId: string) {
    return this.prisma.generatorCalculation.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  list(projectId: string) {
    return this.prisma.generatorCalculation.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
