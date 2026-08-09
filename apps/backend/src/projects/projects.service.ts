import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string) {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { appliances: true } } },
    });
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        ownerId: userId,
        name: dto.name,
        type: (dto.type as any) ?? "RESIDENTIAL",
        countryCode: dto.countryCode ?? "US",
        region: dto.region,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: dto.timezone ?? "UTC",
        currency: dto.currency ?? "USD",
      },
    });
    await this.audit.log({ userId, action: "PROJECT_CREATED", resourceType: "project", resourceId: project.id });
    return project;
  }

  async findOne(projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException("Project not found.");
    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.assertEditable(projectId, userId);
    return this.prisma.project.update({ where: { id: projectId }, data: dto as any });
  }

  async remove(userId: string, projectId: string) {
    const project = await this.findOne(projectId);
    if (project.ownerId !== userId) {
      throw new ForbiddenException("Only the project owner can delete the project.");
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    await this.audit.log({ userId, action: "PROJECT_DELETED", resourceType: "project", resourceId: projectId });
    return { deleted: true };
  }

  async listMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async addMember(actingUserId: string, projectId: string, dto: AddMemberDto) {
    const project = await this.findOne(projectId);
    if (project.ownerId !== actingUserId) {
      throw new ForbiddenException("Only the project owner can manage members.");
    }
    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!targetUser) throw new NotFoundException("No user found with that email.");

    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: targetUser.id } },
      update: { role: dto.role as any },
      create: { projectId, userId: targetUser.id, role: dto.role as any },
    });
  }

  async updateMemberRole(actingUserId: string, projectId: string, memberId: string, role: string) {
    const project = await this.findOne(projectId);
    if (project.ownerId !== actingUserId) {
      throw new ForbiddenException("Only the project owner can manage members.");
    }
    return this.prisma.projectMember.update({ where: { id: memberId }, data: { role: role as any } });
  }

  async removeMember(actingUserId: string, projectId: string, memberId: string) {
    const project = await this.findOne(projectId);
    if (project.ownerId !== actingUserId) {
      throw new ForbiddenException("Only the project owner can manage members.");
    }
    await this.prisma.projectMember.delete({ where: { id: memberId } });
    return { removed: true };
  }

  private async assertEditable(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException("Project not found.");
    const isOwner = project.ownerId === userId;
    const isEditor = project.members.some((m) => m.role === "EDITOR" || m.role === "ADMIN");
    if (!isOwner && !isEditor) throw new ForbiddenException("You do not have edit access to this project.");
    return project;
  }
}
