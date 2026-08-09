import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CalculationsService } from "./calculations.service";
import { RunCalculationDto } from "./dto/run-calculation.dto";

@ApiTags("projects/calculations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/calculations")
export class CalculationsController {
  constructor(private readonly service: CalculationsService) {}

  @Post()
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: RunCalculationDto,
  ) {
    return this.service.run(user.id, projectId, dto);
  }

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("calculations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("calculations")
export class CalculationDetailController {
  constructor(private readonly service: CalculationsService) {}

  @Get(":calculationId")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("calculationId") calculationId: string) {
    return this.service.findOne(user.id, calculationId);
  }

  @Delete(":calculationId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("calculationId") calculationId: string) {
    return this.service.remove(user.id, calculationId);
  }
}
