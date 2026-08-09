import { Global, Module } from "@nestjs/common";
import { CalculationEngineService } from "./calculation-engine.service";

@Global()
@Module({
  providers: [CalculationEngineService],
  exports: [CalculationEngineService],
})
export class CalculationEngineModule {}
