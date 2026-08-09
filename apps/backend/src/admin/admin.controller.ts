import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { PrismaService } from "../common/prisma/prisma.service";

// Admin Backend (Architecture.docx §27/§46). Appliance-catalog and tariff
// admin routes live in their respective modules; this controller covers
// user management and the product analytics overview.
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("users")
  listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
      take: 200,
    });
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, phone: true },
    });
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: { role?: string; status?: string }) {
    return this.prisma.user.update({ where: { id }, data: dto as any });
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "DELETED" } });
    return { deleted: true };
  }

  @Get("analytics/overview")
  async analyticsOverview() {
    const [users, projects, appliances, calculations, reports, solarCalcs, inverterCalcs] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.projectAppliance.count({ where: { deletedAt: null } }),
      this.prisma.calculation.count(),
      this.prisma.report.count(),
      this.prisma.solarCalculation.count(),
      this.prisma.inverterCalculation.count(),
    ]);
    return { users, projects, appliances, calculations, reports, solarCalculations: solarCalcs, inverterCalculations: inverterCalcs };
  }

  @Get("analytics/calculations")
  async analyticsCalculations() {
    const recent = await this.prisma.calculation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, projectId: true, monthlyKwh: true, peakWatts: true, createdAt: true },
    });
    return { recent };
  }

  @Get("analytics/appliances")
  async analyticsAppliances() {
    const top = await this.prisma.projectAppliance.groupBy({
      by: ["name"],
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 10,
    });
    return { mostUsed: top.map((t) => ({ name: t.name, count: t._count.name })) };
  }
}
