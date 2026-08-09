import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("projects/reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/reports")
export class ProjectReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body()
    dto: {
      type?: string;
      lineItems?: Array<{ label: string; description?: string; unitCost: number; quantity: number }>;
    },
  ) {
    return this.service.create(user.id, projectId, dto.type ?? "PROJECT_SUMMARY", dto.lineItems);
  }

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsDetailController {
  constructor(private readonly service: ReportsService) {}

  @Get(":reportId")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("reportId") reportId: string) {
    return this.service.findOne(user.id, reportId);
  }

  @Get(":reportId/download")
  download(@CurrentUser() user: AuthenticatedUser, @Param("reportId") reportId: string) {
    return this.service.getDownloadUrl(user.id, reportId);
  }

  @Delete(":reportId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("reportId") reportId: string) {
    return this.service.remove(user.id, reportId);
  }
}
