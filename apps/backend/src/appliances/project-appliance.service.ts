import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import {
  BulkCreateProjectApplianceDto,
  CreateProjectApplianceDto,
  UpdateProjectApplianceDto,
} from "./dto/project-appliance.dto";

@Injectable()
export class ProjectApplianceService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.projectAppliance.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findOne(projectId: string, applianceId: string) {
    const appliance = await this.prisma.projectAppliance.findFirst({
      where: { id: applianceId, projectId, deletedAt: null },
    });
    if (!appliance) throw new NotFoundException("Appliance not found.");
    return appliance;
  }

  async create(projectId: string, dto: CreateProjectApplianceDto) {
    // Snapshot semantics (Architecture.docx §9): don't rely on live catalog
    // values — copy the electrical values in at creation time so later
    // catalog edits never silently change a user's existing calculations.
    return this.prisma.projectAppliance.create({
      data: {
        projectId,
        catalogApplianceId: dto.catalogApplianceId,
        name: dto.name,
        category: dto.category,
        quantity: dto.quantity,
        ratedWatts: dto.ratedWatts,
        surgeWatts: dto.surgeWatts ?? dto.ratedWatts,
        voltage: dto.voltage ?? 230,
        powerFactor: dto.powerFactor ?? 0.9,
        standbyWatts: dto.standbyWatts ?? 0,
        hoursPerDay: dto.hoursPerDay,
        daysPerMonth: dto.daysPerMonth ?? 30,
        startTime: dto.startTime,
        priority: (dto.priority as any) ?? "IMPORTANT",
      },
    });
  }

  async bulkCreate(projectId: string, dto: BulkCreateProjectApplianceDto) {
    const created = await this.prisma.$transaction(
      dto.appliances.map((appliance) =>
        this.prisma.projectAppliance.create({
          data: {
            projectId,
            catalogApplianceId: appliance.catalogApplianceId,
            name: appliance.name,
            category: appliance.category,
            quantity: appliance.quantity,
            ratedWatts: appliance.ratedWatts,
            surgeWatts: appliance.surgeWatts ?? appliance.ratedWatts,
            voltage: appliance.voltage ?? 230,
            powerFactor: appliance.powerFactor ?? 0.9,
            standbyWatts: appliance.standbyWatts ?? 0,
            hoursPerDay: appliance.hoursPerDay,
            daysPerMonth: appliance.daysPerMonth ?? 30,
            startTime: appliance.startTime,
            priority: (appliance.priority as any) ?? "IMPORTANT",
          },
        }),
      ),
    );
    return created;
  }

  async update(projectId: string, applianceId: string, dto: UpdateProjectApplianceDto) {
    await this.findOne(projectId, applianceId);
    return this.prisma.projectAppliance.update({
      where: { id: applianceId },
      data: dto as any,
    });
  }

  async duplicate(projectId: string, applianceId: string) {
    const appliance = await this.findOne(projectId, applianceId);
    const { id, createdAt, updatedAt, deletedAt, ...rest } = appliance;
    return this.prisma.projectAppliance.create({ data: { ...rest, name: `${rest.name} (copy)` } as any });
  }

  async remove(projectId: string, applianceId: string) {
    await this.findOne(projectId, applianceId);
    await this.prisma.projectAppliance.update({
      where: { id: applianceId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
