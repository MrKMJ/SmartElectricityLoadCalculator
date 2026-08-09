import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { ProjectApplianceService } from "./project-appliance.service";
import {
  BulkCreateProjectApplianceDto,
  CreateProjectApplianceDto,
  UpdateProjectApplianceDto,
} from "./dto/project-appliance.dto";

@ApiTags("projects/appliances")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/appliances")
export class ProjectApplianceController {
  constructor(private readonly service: ProjectApplianceService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateProjectApplianceDto) {
    return this.service.create(projectId, dto);
  }

  @Post("bulk")
  bulkCreate(@Param("projectId") projectId: string, @Body() dto: BulkCreateProjectApplianceDto) {
    return this.service.bulkCreate(projectId, dto);
  }

  @Get(":applianceId")
  findOne(@Param("projectId") projectId: string, @Param("applianceId") applianceId: string) {
    return this.service.findOne(projectId, applianceId);
  }

  @Patch(":applianceId")
  update(
    @Param("projectId") projectId: string,
    @Param("applianceId") applianceId: string,
    @Body() dto: UpdateProjectApplianceDto,
  ) {
    return this.service.update(projectId, applianceId, dto);
  }

  @Post(":applianceId/duplicate")
  duplicate(@Param("projectId") projectId: string, @Param("applianceId") applianceId: string) {
    return this.service.duplicate(projectId, applianceId);
  }

  @Delete(":applianceId")
  remove(@Param("projectId") projectId: string, @Param("applianceId") applianceId: string) {
    return this.service.remove(projectId, applianceId);
  }
}
