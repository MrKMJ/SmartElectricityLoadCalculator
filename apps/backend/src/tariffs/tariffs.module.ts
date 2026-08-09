import { Module } from "@nestjs/common";
import { TariffsController, ProjectTariffController, AdminTariffsController } from "./tariffs.controller";
import { TariffsService } from "./tariffs.service";

@Module({
  controllers: [TariffsController, ProjectTariffController, AdminTariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}
