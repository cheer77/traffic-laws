import { createApplication } from "./application";
import { readConfig } from "./config/config";
import { DatabaseService } from "./database/database.service";
async function main() {
  const config = readConfig();
  const { app } = await createApplication(config);
  try {
    const db = app.get(DatabaseService);
    // Runtime must not have publication authority, even when an operator supplies the wrong URL.
    const [permissions] = await db.$queryRaw<
      Array<{ canPublish: boolean }>
    >`SELECT has_table_privilege(current_user, '"Publication"', 'INSERT') AS "canPublish"`;
    if (permissions.canPublish) {
      throw new Error("Use a restricted runtime database role");
    }
    app.enableShutdownHooks();
    await app.listen(config.port, config.host);
    process.stdout.write(`${JSON.stringify({ event: "api.started", port: config.port })}\n`);
  } catch (error) {
    await app.close();
    throw error;
  }
}
main().catch(() => {
  process.stderr.write(
    '{"event":"api.start_failed","message":"Check configuration, migrations and runtime database permissions"}\n',
  );
  process.exitCode = 1;
});
