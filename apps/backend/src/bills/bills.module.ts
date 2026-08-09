import { Module } from "@nestjs/common";
import { BillsController, BillDetailController } from "./bills.controller";
import { BillsService } from "./bills.service";

@Module({
  controllers: [BillsController, BillDetailController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
