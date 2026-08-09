import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ScenariosService } from "./scenarios.service";
import { CompareScenariosDto, CreateScenarioDto, UpsertScenarioApplianceDto } from "./dto/scenario.dto";

@ApiTags("projects/scenarios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/scenarios")
export class ProjectScenariosController {
  constructor(private readonly service: ScenariosService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateScenarioDto) {
    return this.service.create(projectId, dto);
  }

  @Post("compare")
  compare(@Param("projectId") projectId: string, @Body() dto: CompareScenariosDto) {
    return this.service.compare(projectId, dto.scenarioIds);
  }
}

@ApiTags("scenarios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("scenarios")
export class ScenariosController {
  constructor(private readonly service: ScenariosService) {}

  @Get(":scenarioId")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("scenarioId") scenarioId: string) {
    return this.service.findOne(user.id, scenarioId);
  }

  @Patch(":scenarioId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("scenarioId") scenarioId: string,
    @Body() dto: { name: string },
  ) {
    return this.service.update(user.id, scenarioId, dto.name);
  }

  @Delete(":scenarioId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("scenarioId") scenarioId: string) {
    return this.service.remove(user.id, scenarioId);
  }

  @Post(":scenarioId/appliances")
  addAppliance(
    @CurrentUser() user: AuthenticatedUser,
    @Param("scenarioId") scenarioId: string,
    @Body() dto: UpsertScenarioApplianceDto,
  ) {
    return this.service.upsertAppliance(user.id, scenarioId, dto);
  }

  @Patch(":scenarioId/appliances/:applianceId")
  updateAppliance(
    @CurrentUser() user: AuthenticatedUser,
    @Param("scenarioId") scenarioId: string,
    @Param("applianceId") applianceId: string,
    @Body() dto: UpsertScenarioApplianceDto,
  ) {
    return this.service.upsertAppliance(user.id, scenarioId, dto, applianceId);
  }

  @Delete(":scenarioId/appliances/:applianceId")
  removeAppliance(
    @CurrentUser() user: AuthenticatedUser,
    @Param("scenarioId") scenarioId: string,
    @Param("applianceId") applianceId: string,
  ) {
    return this.service.removeAppliance(user.id, scenarioId, applianceId);
  }

  @Post(":scenarioId/calculate")
  calculate(@CurrentUser() user: AuthenticatedUser, @Param("scenarioId") scenarioId: string) {
    return this.service.calculate(user.id, scenarioId);
  }
}
