import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CatalogService } from "./catalog.service";
import { CreateCatalogApplianceDto, CreateCategoryDto, UpdateCatalogApplianceDto } from "./dto/catalog.dto";

// Public read routes (any authenticated user browsing the appliance
// database), admin-only write routes — matches Architecture.docx §8/§27.
@ApiTags("appliances/catalog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("appliances")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("categories")
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get("catalog")
  search(
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("minWatts") minWatts?: string,
    @Query("maxWatts") maxWatts?: string,
    @Query("voltage") voltage?: string,
  ) {
    return this.catalogService.search({ category, q, minWatts, maxWatts, voltage });
  }

  @Get("search")
  searchAlias(@Query("q") q?: string) {
    return this.catalogService.search({ q });
  }

  @Get("catalog/:id")
  findOne(@Param("id") id: string) {
    return this.catalogService.findOne(id);
  }
}

@ApiTags("admin/appliances")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN")
@Controller("admin")
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Post("appliances")
  create(@Body() dto: CreateCatalogApplianceDto) {
    return this.catalogService.create(dto);
  }

  @Patch("appliances/:id")
  update(@Param("id") id: string, @Body() dto: UpdateCatalogApplianceDto) {
    return this.catalogService.update(id, dto);
  }

  @Delete("appliances/:id")
  remove(@Param("id") id: string) {
    return this.catalogService.remove(id);
  }
}
