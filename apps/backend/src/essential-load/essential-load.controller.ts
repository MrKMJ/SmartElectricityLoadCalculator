import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsArray } from "class-validator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { EssentialLoadService } from "./essential-load.service";

class SetPrioritiesDto {
  @IsArray()
  updates: Array<{ applianceId: string; priority: string }>;
}

@ApiTags("projects/essential-load")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/essential-load")
export class EssentialLoadController {
  constructor(private readonly service: EssentialLoadService) {}

  @Post()
  recalculate(@Param("projectId") projectId: string) {
    return this.service.recalculate(projectId);
  }

  @Get()
  get(@Param("projectId") projectId: string) {
    return this.service.get(projectId);
  }

  @Patch()
  setPriorities(@Param("projectId") projectId: string, @Body() dto: SetPrioritiesDto) {
    return this.service.setPriorities(projectId, dto.updates);
  }
}
