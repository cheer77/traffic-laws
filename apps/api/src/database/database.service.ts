import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../.generated/client/client";
import { API_CONFIG, type ApiConfig } from "../config/config";
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    super({
      adapter: new PrismaPg({
        connectionString: config.databaseUrl,
        max: 10,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30000,
        statement_timeout: 5000,
      }),
      log: [],
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
