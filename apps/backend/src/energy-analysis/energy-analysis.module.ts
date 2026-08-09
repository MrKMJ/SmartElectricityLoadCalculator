import { Module } from "@nestjs/common";
import { EnergyAnalysisController } from "./energy-analysis.controller";
import { EnergyAnalysisService } from "./energy-analysis.service";

@Module({
  controllers: [EnergyAnalysisController],
  providers: [EnergyAnalysisService],
})
export class EnergyAnalysisModule {}
