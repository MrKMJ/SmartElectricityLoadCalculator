import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CalculationEngineService } from "../common/calculation-engine/calculation-engine.service";
import { LoadEngineApplianceInput } from "../common/calculation-engine/types";
import { UpsertScheduleItemDto } from "./dto/schedule.dto";

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: CalculationEngineService,
  ) {}

  private async getOrCreateSchedule(projectId: string) {
    const existing = await this.prisma.schedule.findFirst({ where: { projectId } });
    if (existing) return existing;
    return this.prisma.schedule.create({ data: { projectId, name: "Daily Schedule" } });
  }

  async getScheduleWithTimeline(projectId: string) {
    const schedule = await this.getOrCreateSchedule(projectId);
    const items = await this.prisma.scheduleItem.findMany({ where: { scheduleId: schedule.id } });
    const appliances = await this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null, isActive: true },
    });

    const itemByAppliance = new Map(items.map((i) => [i.projectApplianceId, i]));

    const inputs: LoadEngineApplianceInput[] = appliances.map((a) => {
      const item = itemByAppliance.get(a.id);
      return {
        id: a.id,
        name: a.name,
        quantity: a.quantity,
        ratedWatts: a.ratedWatts,
        surgeWatts: a.surgeWatts,
        hoursPerDay: item ? durationHours(item.startTime, item.endTime) : a.hoursPerDay,
        startTime: item?.startTime ?? a.startTime ?? undefined,
      };
    });

    const timeline = this.engine.peakLoad.buildPeakLoadTimeline(inputs);

    return {
      schedule,
      items: appliances.map((a) => ({
        projectApplianceId: a.id,
        name: a.name,
        category: a.category,
        ratedWatts: a.ratedWatts,
        quantity: a.quantity,
        startTime: itemByAppliance.get(a.id)?.startTime ?? a.startTime ?? null,
        endTime: itemByAppliance.get(a.id)?.endTime ?? null,
        hoursPerDay: itemByAppliance.get(a.id) ? durationHours(itemByAppliance.get(a.id)!.startTime, itemByAppliance.get(a.id)!.endTime) : a.hoursPerDay,
      })),
      timeline: timeline.timeline,
      peakRunningWatts: timeline.peakRunningWatts,
      peakSurgeWatts: timeline.peakSurgeWatts,
      peakTime: timeline.peakTime,
    };
  }

  async upsertItem(projectId: string, applianceId: string, dto: UpsertScheduleItemDto) {
    const appliance = await this.prisma.projectAppliance.findFirst({
      where: { id: applianceId, projectId, deletedAt: null },
    });
    if (!appliance) throw new NotFoundException("Appliance not found in this project.");

    const hours = durationHours(dto.startTime, dto.endTime);
    if (hours <= 0) {
      throw new BadRequestException("endTime must be after startTime (overnight schedules are not yet supported).");
    }

    const schedule = await this.getOrCreateSchedule(projectId);
    const existing = await this.prisma.scheduleItem.findFirst({
      where: { scheduleId: schedule.id, projectApplianceId: applianceId },
    });

    if (existing) {
      await this.prisma.scheduleItem.update({
        where: { id: existing.id },
        data: { startTime: dto.startTime, endTime: dto.endTime },
      });
    } else {
      await this.prisma.scheduleItem.create({
        data: { scheduleId: schedule.id, projectApplianceId: applianceId, startTime: dto.startTime, endTime: dto.endTime },
      });
    }

    // Keep the main appliance record in sync so the Calculator/Peak Load
    // pages (which read ProjectAppliance directly) reflect the schedule.
    await this.prisma.projectAppliance.update({
      where: { id: applianceId },
      data: { startTime: dto.startTime, hoursPerDay: hours },
    });

    return this.getScheduleWithTimeline(projectId);
  }

  async removeItem(projectId: string, applianceId: string) {
    const schedule = await this.getOrCreateSchedule(projectId);
    await this.prisma.scheduleItem.deleteMany({ where: { scheduleId: schedule.id, projectApplianceId: applianceId } });
    return this.getScheduleWithTimeline(projectId);
  }

  async optimize(projectId: string) {
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
    }));
    return this.engine.schedule.optimizeSchedule(inputs);
  }

  async applySuggestion(projectId: string, applianceId: string, suggestedStartHour: number) {
    const appliance = await this.prisma.projectAppliance.findFirst({
      where: { id: applianceId, projectId, deletedAt: null },
    });
    if (!appliance) throw new NotFoundException("Appliance not found in this project.");

    const startTime = `${String(suggestedStartHour).padStart(2, "0")}:00`;
    const endHour = (suggestedStartHour + Math.max(1, Math.round(appliance.hoursPerDay))) % 24;
    const endTime = `${String(endHour).padStart(2, "0")}:00`;

    return this.upsertItem(projectId, applianceId, { startTime, endTime: endHour === 0 ? "23:59" : endTime });
  }
}

function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}
