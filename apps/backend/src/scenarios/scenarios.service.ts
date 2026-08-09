import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { LoadEngineApplianceInput } from "../common/calculation-engine/types";
import { CreateScenarioDto, UpsertScenarioApplianceDto } from "./dto/scenario.dto";

@Injectable()
export class ScenariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  list(projectId: string) {
    return this.prisma.scenario.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { result: true },
    });
  }

  /**
   * Clone -> Scenario -> Modify -> Run -> Compare (Architecture.docx §33).
   * The scenario starts as a MODIFY-flagged copy of every current project
   * appliance so the user edits from a realistic baseline without ever
   * touching the original project.
   */
  async create(projectId: string, dto: CreateScenarioDto) {
    const baseAppliances = await this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null, isActive: true },
    });

    const latestCalc = await this.prisma.calculation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return this.prisma.scenario.create({
      data: {
        projectId,
        name: dto.name,
        baseCalculationId: latestCalc?.id,
        appliances: {
          create: baseAppliances.map((a) => ({
            projectApplianceId: a.id,
            action: "MODIFY",
            name: a.name,
            quantity: a.quantity,
            ratedWatts: a.ratedWatts,
            surgeWatts: a.surgeWatts,
            hoursPerDay: a.hoursPerDay,
          })),
        },
      },
      include: { appliances: true },
    });
  }

  async findOne(userId: string, scenarioId: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { appliances: true, result: true },
    });
    if (!scenario) throw new NotFoundException("Scenario not found.");
    await this.assertProjectAccess(userId, scenario.projectId);
    return scenario;
  }

  async update(userId: string, scenarioId: string, name: string) {
    await this.findOne(userId, scenarioId);
    return this.prisma.scenario.update({ where: { id: scenarioId }, data: { name } });
  }

  async remove(userId: string, scenarioId: string) {
    await this.findOne(userId, scenarioId);
    await this.prisma.scenario.delete({ where: { id: scenarioId } });
    return { deleted: true };
  }

  async upsertAppliance(userId: string, scenarioId: string, dto: UpsertScenarioApplianceDto, applianceId?: string) {
    await this.findOne(userId, scenarioId);
    if (applianceId) {
      return this.prisma.scenarioAppliance.update({
        where: { id: applianceId },
        data: {
          action: dto.action as any,
          name: dto.name,
          quantity: dto.quantity,
          ratedWatts: dto.ratedWatts,
          surgeWatts: dto.surgeWatts ?? dto.ratedWatts,
          hoursPerDay: dto.hoursPerDay,
        },
      });
    }
    return this.prisma.scenarioAppliance.create({
      data: {
        scenarioId,
        projectApplianceId: dto.projectApplianceId,
        action: dto.action as any,
        name: dto.name,
        quantity: dto.quantity,
        ratedWatts: dto.ratedWatts,
        surgeWatts: dto.surgeWatts ?? dto.ratedWatts,
        hoursPerDay: dto.hoursPerDay,
      },
    });
  }

  async removeAppliance(userId: string, scenarioId: string, applianceId: string) {
    await this.findOne(userId, scenarioId);
    await this.prisma.scenarioAppliance.delete({ where: { id: applianceId } });
    return { deleted: true };
  }

  async calculate(userId: string, scenarioId: string) {
    const scenario = await this.findOne(userId, scenarioId);
    const activeItems = scenario.appliances.filter((a) => a.action !== "REMOVE");

    const inputs: LoadEngineApplianceInput[] = activeItems.map((a) => ({
      id: a.id,
      name: a.name,
      quantity: a.quantity,
      ratedWatts: a.ratedWatts,
      surgeWatts: a.surgeWatts,
      hoursPerDay: a.hoursPerDay,
    }));

    const summary = this.engine.load.calculateLoadSummary(inputs);
    const peak = this.engine.peakLoad.buildPeakLoadTimeline(inputs);

    const projectTariff = await this.prisma.projectTariff.findUnique({
      where: { projectId: scenario.projectId },
      include: { tariff: { include: { slabs: true } } },
    });
    const bill = projectTariff
      ? this.engine.bill.calculateBill(
          summary.monthlyKwh,
          projectTariff.tariff.slabs.map((s) => ({
            minKwh: s.minKwh,
            maxKwh: s.maxKwh,
            ratePerKwh: s.ratePerKwh,
            fixedCharge: s.fixedCharge,
            taxRatePct: s.taxRatePct,
          })),
        )
      : null;

    const inverter = this.engine.inverter.calculateInverterSizing({
      peakRunningW: peak.peakRunningWatts,
      peakSurgeW: peak.peakSurgeWatts,
    });
    const battery = this.engine.battery.calculateBatterySizing({
      loadW: summary.runningWatts,
      backupHours: 4,
    });
    const solarFormula = this.engine.solar.calculateSolarSizing({
      dailyKwh: summary.dailyKwh,
      peakSunHours: 4.5,
    });
    const generator = this.engine.generator.calculateGeneratorSizing({
      runningLoadW: summary.runningWatts,
      startingLoadW: Math.max(0, peak.peakSurgeWatts - peak.peakRunningWatts),
    });

    const result = await this.prisma.scenarioResult.upsert({
      where: { scenarioId },
      update: {
        peakLoadW: peak.peakSurgeWatts,
        dailyKwh: summary.dailyKwh,
        monthlyKwh: summary.monthlyKwh,
        estimatedBill: bill?.calculatedAmount ?? 0,
        inverterVA: inverter.recommendedInverterVA,
        batteryAh: battery.requiredAh,
        solarKw: solarFormula.requiredKw,
        generatorKva: generator.recommendedKva,
      },
      create: {
        scenarioId,
        peakLoadW: peak.peakSurgeWatts,
        dailyKwh: summary.dailyKwh,
        monthlyKwh: summary.monthlyKwh,
        estimatedBill: bill?.calculatedAmount ?? 0,
        inverterVA: inverter.recommendedInverterVA,
        batteryAh: battery.requiredAh,
        solarKw: solarFormula.requiredKw,
        generatorKva: generator.recommendedKva,
      },
    });

    await this.prisma.scenario.update({ where: { id: scenarioId }, data: { status: "calculated" } });

    return result;
  }

  async compare(projectId: string, scenarioIds: string[]) {
    if (scenarioIds.length === 0) throw new BadRequestException("Provide at least one scenario ID.");

    const scenarios = await this.prisma.scenario.findMany({
      where: { id: { in: scenarioIds }, projectId },
      include: { result: true },
    });

    const currentCalc = await this.prisma.calculation.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return {
      current: currentCalc && {
        label: "Current",
        peakLoadW: currentCalc.surgeWatts,
        dailyKwh: currentCalc.dailyKwh,
        monthlyKwh: currentCalc.monthlyKwh,
        estimatedBill: currentCalc.estimatedBill,
      },
      scenarios: scenarios.map((s) => ({
        id: s.id,
        label: s.name,
        result: s.result,
      })),
    };
  }

  private async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException("Scenario not found.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (project.ownerId !== userId && project.members.length === 0 && !isAdmin) {
      throw new NotFoundException("Scenario not found.");
    }
  }
}
