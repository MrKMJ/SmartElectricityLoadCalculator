import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { EnergyAnalysisService } from "./energy-analysis.service";

@ApiTags("projects/energy-analysis")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId")
export class EnergyAnalysisController {
  constructor(private readonly service: EnergyAnalysisService) {}

  @Get("energy-analysis")
  analyze(@Param("projectId") projectId: string) {
    return this.service.analyze(projectId);
  }

  @Get("savings")
  savings(@Param("projectId") projectId: string) {
    return this.service.savings(projectId);
  }

  @Post("savings/simulate")
  simulate(@Param("projectId") projectId: string, @Body() dto: { applianceIds: string[] }) {
    return this.service.simulate(projectId, dto.applianceIds ?? []);
  }
}
