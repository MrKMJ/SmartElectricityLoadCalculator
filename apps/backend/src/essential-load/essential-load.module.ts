import { Module } from "@nestjs/common";
import { EssentialLoadController } from "./essential-load.controller";
import { EssentialLoadService } from "./essential-load.service";

@Module({
  controllers: [EssentialLoadController],
  providers: [EssentialLoadService],
})
export class EssentialLoadModule {}
