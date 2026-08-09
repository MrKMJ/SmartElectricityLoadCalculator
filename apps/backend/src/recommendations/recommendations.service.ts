import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  list(projectId: string) {
    return this.prisma.recommendation.findMany({
      where: { projectId },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
  }

  async generate(projectId: string) {
    const latestCalc = await this.prisma.calculation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    if (!latestCalc) {
      throw new BadRequestException("Run a calculation first before generating recommendations.");
    }

    const inverter = await this.prisma.inverterCalculation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    const battery = await this.prisma.batteryCalculation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    const generated = this.engine.recommendation.generateRecommendations({
      peakRunningWatts: latestCalc.peakWatts ?? 0,
      peakSurgeWatts: latestCalc.surgeWatts ?? 0,
      monthlyKwh: latestCalc.monthlyKwh ?? 0,
      items: latestCalc.items.map((i) => ({
        applianceId: i.projectApplianceId ?? undefined,
        name: i.name,
        quantity: i.quantity,
        runningWatts: i.runningWatts,
        surgeWatts: i.surgeWatts,
        hoursPerDay: i.hoursPerDay,
        dailyKwh: i.dailyKwh,
        monthlyKwh: i.monthlyKwh,
      })),
      inverterVA: inverter?.recommendedInverterVA,
      batteryEstimatedRuntimeHours: battery?.estimatedRuntimeHours,
      desiredBackupHours: battery?.backupHours,
    });

    if (generated.length === 0) return [];

    await this.prisma.recommendation.createMany({
      data: generated.map((r) => ({
        projectId,
        type: r.type,
        severity: r.severity as any,
        message: r.message,
        meta: r.meta as any,
      })),
    });

    return this.list(projectId);
  }

  async resolve(projectId: string, recommendationId: string) {
    await this.prisma.recommendation.updateMany({
      where: { id: recommendationId, projectId },
      data: { resolvedAt: new Date() },
    });
    return { resolved: true };
  }
}
