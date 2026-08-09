import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { InstallerService } from "./installer.service";

@ApiTags("installer")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("installer")
export class InstallerController {
  constructor(private readonly service: InstallerService) {}

  // Any authenticated user can call this (it only ever returns projects
  // they already have access to) — the PROFESSIONAL/INSTALLER framing is a
  // frontend affordance, not an authorization boundary, so a regular user
  // who's been added to a couple of shared projects still sees them here.
  @Get("clients")
  listClients(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listClients(user.id);
  }
}
