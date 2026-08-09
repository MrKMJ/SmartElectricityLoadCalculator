import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

export interface AuditEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}

// Records the actions listed in Architecture.docx §47 (LOGIN, PROJECT_CREATED,
// CALCULATION_CREATED, REPORT_GENERATED, etc). Failures to write an audit
// entry must never break the primary request, so errors are swallowed here.
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          meta: entry.meta as any,
          ipAddress: entry.ip,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log for ${entry.action}: ${(error as Error).message}`);
    }
  }
}
