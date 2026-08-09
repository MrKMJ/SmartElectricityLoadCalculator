import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { InverterSizingService } from "./inverter.service";
import { BatterySizingService } from "./battery.service";
import { SolarSizingService } from "./solar.service";
import { GeneratorSizingService } from "./generator.service";
import { InverterSizingDto, BatterySizingDto, SolarSizingDto, GeneratorSizingDto } from "./dto/sizing.dto";

@ApiTags("projects/sizing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/sizing/inverter")
export class InverterSizingController {
  constructor(private readonly service: InverterSizingService) {}

  @Post()
  calculate(@Param("projectId") projectId: string, @Body() dto: InverterSizingDto) {
    return this.service.calculate(projectId, dto);
  }

  @Get()
  latest(@Param("projectId") projectId: string) {
    return this.service.latest(projectId);
  }

  @Get("history")
  history(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("projects/sizing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/sizing/battery")
export class BatterySizingController {
  constructor(private readonly service: BatterySizingService) {}

  @Post()
  calculate(@Param("projectId") projectId: string, @Body() dto: BatterySizingDto) {
    return this.service.calculate(projectId, dto);
  }

  @Get()
  latest(@Param("projectId") projectId: string) {
    return this.service.latest(projectId);
  }

  @Get("history")
  history(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("projects/sizing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/sizing/solar")
export class SolarSizingController {
  constructor(private readonly service: SolarSizingService) {}

  @Post()
  calculate(@Param("projectId") projectId: string, @Body() dto: SolarSizingDto) {
    return this.service.calculate(projectId, dto);
  }

  @Get()
  latest(@Param("projectId") projectId: string) {
    return this.service.latest(projectId);
  }

  @Get("history")
  history(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("projects/sizing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/sizing/generator")
export class GeneratorSizingController {
  constructor(private readonly service: GeneratorSizingService) {}

  @Post()
  calculate(@Param("projectId") projectId: string, @Body() dto: GeneratorSizingDto) {
    return this.service.calculate(projectId, dto);
  }

  @Get()
  latest(@Param("projectId") projectId: string) {
    return this.service.latest(projectId);
  }

  @Get("history")
  history(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}
