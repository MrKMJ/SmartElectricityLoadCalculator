import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { TariffsService } from "./tariffs.service";
import { CreateTariffDto, SelectProjectTariffDto } from "./dto/tariff.dto";

@ApiTags("tariffs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tariffs")
export class TariffsController {
  constructor(private readonly service: TariffsService) {}

  @Get()
  list(@Query("countryCode") countryCode?: string) {
    return this.service.list(countryCode);
  }

  @Get(":tariffId")
  findOne(@Param("tariffId") tariffId: string) {
    return this.service.findOne(tariffId);
  }

  @Get(":tariffId/slabs")
  slabs(@Param("tariffId") tariffId: string) {
    return this.service.slabs(tariffId);
  }
}

@ApiTags("projects/tariff")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/tariff")
export class ProjectTariffController {
  constructor(private readonly service: TariffsService) {}

  @Get()
  get(@Param("projectId") projectId: string) {
    return this.service.getProjectTariff(projectId);
  }

  @Post()
  set(@Param("projectId") projectId: string, @Body() dto: SelectProjectTariffDto) {
    return this.service.setProjectTariff(projectId, dto);
  }

  @Patch()
  update(@Param("projectId") projectId: string, @Body() dto: SelectProjectTariffDto) {
    return this.service.setProjectTariff(projectId, dto);
  }
}

@ApiTags("admin/tariffs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("admin/tariffs")
export class AdminTariffsController {
  constructor(private readonly service: TariffsService) {}

  @Post()
  create(@Body() dto: CreateTariffDto) {
    return this.service.create(dto);
  }

  @Delete(":tariffId")
  remove(@Param("tariffId") tariffId: string) {
    return this.service.remove(tariffId);
  }
}
