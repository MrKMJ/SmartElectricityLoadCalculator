import { Module } from "@nestjs/common";
import { CalculationsController, CalculationDetailController } from "./calculations.controller";
import { CalculationsService } from "./calculations.service";

@Module({
  controllers: [CalculationsController, CalculationDetailController],
  providers: [CalculationsService],
  exports: [CalculationsService],
})
export class CalculationsModule {}
