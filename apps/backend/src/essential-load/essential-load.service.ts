import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { LoadEngineApplianceInput } from "../common/calculation-engine/types";

@Injectable()
export class EssentialLoadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  async recalculate(projectId: string) {
    const appliances = await this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null, isActive: true },
    });

    const inputs: LoadEngineApplianceInput[] = appliances.map((a) => ({
      id: a.id,
      name: a.name,
      quantity: a.quantity,
      ratedWatts: a.ratedWatts,
      surgeWatts: a.surgeWatts,
      hoursPerDay: a.hoursPerDay,
      startTime: a.startTime ?? undefined,
      priority: a.priority as any,
    }));

    const result = this.engine.essentialLoad.calculateEssentialLoad(inputs);

    return this.prisma.essentialLoadProfile.upsert({
      where: { projectId },
      update: {
        essentialRunningW: result.essentialRunningW,
        essentialPeakW: result.essentialPeakW,
        fullHomeRunningW: result.fullHomeRunningW,
        fullHomePeakW: result.fullHomePeakW,
      },
      create: {
        projectId,
        essentialRunningW: result.essentialRunningW,
        essentialPeakW: result.essentialPeakW,
        fullHomeRunningW: result.fullHomeRunningW,
        fullHomePeakW: result.fullHomePeakW,
      },
    });
  }

  get(projectId: string) {
    return this.prisma.essentialLoadProfile.findUnique({ where: { projectId } });
  }

  async setPriorities(projectId: string, updates: Array<{ applianceId: string; priority: string }>) {
    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.projectAppliance.update({
          where: { id: u.applianceId },
          data: { priority: u.priority as any },
        }),
      ),
    );
    return this.recalculate(projectId);
  }
}
