import { Module, type DynamicModule } from "@nestjs/common";
import { API_CONFIG, type ApiConfig } from "./config/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ScenariosModule } from "./scenarios/scenarios.module";
import { ProgressModule } from "./progress/progress.module";
import { HealthModule } from "./health/health.module";
import { ImportsModule } from "./imports/imports.module";
@Module({})
class ConfigModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [{ provide: API_CONFIG, useValue: config }],
      exports: [API_CONFIG],
    };
  }
}
@Module({})
export class AppModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.register(config),
        DatabaseModule,
        AuthModule,
        UsersModule,
        ScenariosModule,
        ProgressModule,
        ImportsModule,
        HealthModule,
      ],
    };
  }
}
