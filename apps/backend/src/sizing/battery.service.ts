import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { BatterySizingDto } from "./dto/sizing.dto";
import { getLatestCalculationOrThrow } from "./latest-calculation.helper";

@Injectable()
export class BatterySizingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  async calculate(projectId: string, dto: BatterySizingDto) {
    let loadW = dto.loadW;
    if (loadW == null) {
      const latest = await getLatestCalculationOrThrow(this.prisma, projectId);
      loadW = latest.runningWatts ?? 0;
    }

    const result = this.engine.battery.calculateBatterySizing({
      loadW,
      backupHours: dto.backupHours,
      batteryVoltage: dto.batteryVoltage,
      batteryType: dto.batteryType as any,
      depthOfDischarge: dto.depthOfDischarge,
      inverterEfficiency: dto.inverterEfficiency,
      safetyMarginPct: dto.safetyMargin,
      singleBatteryAh: dto.singleBatteryAh,
    });

    return this.prisma.batteryCalculation.create({
      data: {
        projectId,
        loadW: result.loadW,
        backupHours: result.backupHours,
        batteryVoltage: result.batteryVoltage,
        batteryType: result.batteryType as any,
        depthOfDischarge: result.depthOfDischarge,
        inverterEfficiency: result.inverterEfficiency,
        safetyMarginPct: result.safetyMarginPct,
        requiredWh: result.requiredWh,
        requiredAh: result.requiredAh,
        singleBatteryAh: result.singleBatteryAh,
        numberOfBatteries: result.numberOfBatteries,
        configuration: result.configuration,
        estimatedRuntimeHours: result.estimatedRuntimeHours,
      },
    });
  }

  latest(projectId: string) {
    return this.prisma.batteryCalculation.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  list(projectId: string) {
    return this.prisma.batteryCalculation.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
  }
}
