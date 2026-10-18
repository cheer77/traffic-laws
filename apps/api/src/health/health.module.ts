import { Controller, Get, Inject, Module, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.guard";
import { DatabaseService } from "../database/database.service";
@ApiTags("health")
@Public()
@Controller("health")
class HealthController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.$queryRaw`SELECT 1 FROM "User" LIMIT 0`;
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
