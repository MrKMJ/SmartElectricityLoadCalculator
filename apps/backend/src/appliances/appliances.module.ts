import { Module } from "@nestjs/common";
import { CatalogController, AdminCatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { ProjectApplianceController } from "./project-appliance.controller";
import { ProjectApplianceService } from "./project-appliance.service";

@Module({
  controllers: [CatalogController, AdminCatalogController, ProjectApplianceController],
  providers: [CatalogService, ProjectApplianceService],
  exports: [CatalogService, ProjectApplianceService],
})
export class AppliancesModule {}
