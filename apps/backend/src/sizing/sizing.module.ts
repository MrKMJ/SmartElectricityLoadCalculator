import { Module } from "@nestjs/common";
import {
  InverterSizingController,
  BatterySizingController,
  SolarSizingController,
  GeneratorSizingController,
} from "./sizing.controller";
import { InverterSizingService } from "./inverter.service";
import { BatterySizingService } from "./battery.service";
import { SolarSizingService } from "./solar.service";
import { GeneratorSizingService } from "./generator.service";

@Module({
  controllers: [InverterSizingController, BatterySizingController, SolarSizingController, GeneratorSizingController],
  providers: [InverterSizingService, BatterySizingService, SolarSizingService, GeneratorSizingService],
})
export class SizingModule {}
