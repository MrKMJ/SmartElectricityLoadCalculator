import { Module } from "@nestjs/common";
import { ProjectReportsController, ReportsDetailController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportGenerationService } from "./report-generation.service";

@Module({
  controllers: [ProjectReportsController, ReportsDetailController],
  providers: [ReportsService, ReportGenerationService],
  exports: [ReportGenerationService],
})
export class ReportsModule {}
