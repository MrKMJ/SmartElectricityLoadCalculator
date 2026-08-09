import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { PrismaService } from "../common/prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AuditService } from "../audit/audit.service";
import { REPORTS_QUEUE_TOKEN } from "../queue/queue.constants";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Inject(REPORTS_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  // Report Workflow (Architecture.docx §35): create record -> queue job ->
  // worker generates the PDF -> uploads to storage -> updates status ->
  // frontend polls/downloads. The API never blocks on PDF generation.
  async create(
    userId: string,
    projectId: string,
    type: string,
    lineItems?: Array<{ label: string; description?: string; unitCost: number; quantity: number }>,
  ) {
    const report = await this.prisma.report.create({
      data: {
        projectId,
        createdById: userId,
        type: type as any,
        status: "QUEUED",
        lineItems: type === "QUOTATION" ? ((lineItems ?? []) as any) : undefined,
      },
    });
    await this.queue.add("generate", { reportId: report.id }, { removeOnComplete: 50, removeOnFail: 50 });
    await this.audit.log({ userId, action: "REPORT_REQUESTED", resourceType: "report", resourceId: report.id });
    return report;
  }

  list(projectId: string) {
    return this.prisma.report.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 30 });
  }

  async findOne(userId: string, reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Report not found.");
    await this.assertProjectAccess(userId, report.projectId);
    return report;
  }

  async getDownloadUrl(userId: string, reportId: string) {
    const report = await this.findOne(userId, reportId);
    if (report.status !== "COMPLETED" || !report.storageKey) {
      throw new BadRequestException(`Report is not ready yet (status: ${report.status}).`);
    }
    const url = await this.storage.getSignedDownloadUrl(report.storageKey);
    return { url, expiresInSeconds: 900 };
  }

  async remove(userId: string, reportId: string) {
    await this.findOne(userId, reportId);
    await this.prisma.report.delete({ where: { id: reportId } });
    return { deleted: true };
  }

  private async assertProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException("Report not found.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (project.ownerId !== userId && project.members.length === 0 && !isAdmin) {
      throw new NotFoundException("Report not found.");
    }
  }
}
