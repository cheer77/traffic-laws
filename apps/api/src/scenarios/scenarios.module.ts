import { Module } from "@nestjs/common";
import { ScenariosService } from "./scenarios.service";
import { InternalScenariosController, ScenariosController } from "./scenarios.controller";
@Module({
  controllers: [ScenariosController, InternalScenariosController],
  providers: [ScenariosService],
  exports: [ScenariosService],
})
export class ScenariosModule {}
