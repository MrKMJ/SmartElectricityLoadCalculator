import { Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { RecommendationsService } from "./recommendations.service";

@ApiTags("projects/recommendations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/recommendations")
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }

  @Post("generate")
  generate(@Param("projectId") projectId: string) {
    return this.service.generate(projectId);
  }

  @Patch(":recommendationId/resolve")
  resolve(@Param("projectId") projectId: string, @Param("recommendationId") recommendationId: string) {
    return this.service.resolve(projectId, recommendationId);
  }
}
