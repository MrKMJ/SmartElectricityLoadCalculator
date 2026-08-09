import { Module } from "@nestjs/common";
import { ProjectScenariosController, ScenariosController } from "./scenarios.controller";
import { ScenariosService } from "./scenarios.service";

@Module({
  controllers: [ProjectScenariosController, ScenariosController],
  providers: [ScenariosService],
})
export class ScenariosModule {}
