import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { readConfig } from "./config/config";
import { DatabaseService } from "./database/database.service";
import { AuthService } from "./auth/auth.service";
import { CredentialsDto } from "./auth/auth.dto";
async function bootstrap() {
  const config = readConfig();
  const db = new DatabaseService(config);
  try {
    const input = plainToInstance(CredentialsDto, {
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    });
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    await validateOrReject(input, { whitelist: true, forbidNonWhitelisted: true });
    await new AuthService(db, config).bootstrap(input);
    process.stdout.write("Administrator created. No credentials are printed.\n");
  } finally {
    await db.$disconnect();
  }
}
bootstrap().catch(() => {
  process.stderr.write(
    "Bootstrap refused: check input, owner database access, and whether an administrator/email already exists.\n",
  );
  process.exitCode = 1;
});
