import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { SchedulesService } from "./schedules.service";
import { UpsertScheduleItemDto } from "./dto/schedule.dto";

@ApiTags("projects/schedules")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/schedules")
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  get(@Param("projectId") projectId: string) {
    return this.service.getScheduleWithTimeline(projectId);
  }

  @Put("items/:applianceId")
  upsertItem(
    @Param("projectId") projectId: string,
    @Param("applianceId") applianceId: string,
    @Body() dto: UpsertScheduleItemDto,
  ) {
    return this.service.upsertItem(projectId, applianceId, dto);
  }

  @Delete("items/:applianceId")
  removeItem(@Param("projectId") projectId: string, @Param("applianceId") applianceId: string) {
    return this.service.removeItem(projectId, applianceId);
  }

  @Post("optimize")
  optimize(@Param("projectId") projectId: string) {
    return this.service.optimize(projectId);
  }

  @Post("optimize/apply/:applianceId")
  applySuggestion(
    @Param("projectId") projectId: string,
    @Param("applianceId") applianceId: string,
    @Body() dto: { suggestedStartHour: number },
  ) {
    return this.service.applySuggestion(projectId, applianceId, dto.suggestedStartHour);
  }
}
