import { Module } from "@nestjs/common";
import { LoadAnalysisController } from "./load-analysis.controller";

@Module({
  controllers: [LoadAnalysisController],
})
export class LoadAnalysisModule {}
