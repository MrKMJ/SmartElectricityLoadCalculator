import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { BillsService } from "./bills.service";
import { CalculateBillDto } from "./dto/calculate-bill.dto";

@ApiTags("projects/bills")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@Controller("projects/:projectId/bills")
export class BillsController {
  constructor(private readonly service: BillsService) {}

  @Post("calculate")
  calculate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: CalculateBillDto,
  ) {
    return this.service.calculate(user.id, projectId, dto);
  }

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags("bills")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("bills")
export class BillDetailController {
  constructor(private readonly service: BillsService) {}

  @Get(":billId")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("billId") billId: string) {
    return this.service.findOne(user.id, billId);
  }
}
