import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { PrismaService } from "../common/prisma/prisma.service";

@ApiTags("projects/load-analysis")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/load-analysis")
export class LoadAnalysisController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.prisma.loadAnalysis.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  @Get(":analysisId")
  findOne(@Param("projectId") projectId: string, @Param("analysisId") analysisId: string) {
    return this.prisma.loadAnalysis.findFirst({ where: { id: analysisId, projectId } });
  }
}
