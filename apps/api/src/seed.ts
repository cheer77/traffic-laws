import "reflect-metadata";
import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";
import { readConfig } from "./config/config";
import { DatabaseService } from "./database/database.service";
import { ScenariosService } from "./scenarios/scenarios.service";
async function seed() {
  const config = readConfig();
  if (config.nodeEnv === "production") throw new Error("Development seed only");
  const db = new DatabaseService(config);
  try {
    const author = await db.user.findFirst({ where: { role: "admin", status: "active" } });
    if (!author) throw new Error("Bootstrap an administrator first");
    const service = new ScenariosService(db);
    for (const scenario of EDUCATIONAL_DEMO_SCENARIOS) {
      if (!(await db.scenarioRevision.findFirst({ where: { scenarioId: scenario.id } })))
        await service.saveDraft({ payload: { ...scenario }, expectedRevision: 0 }, author.id);
    }
    process.stdout.write("Development drafts seeded; no publications or approvals created.\n");
  } finally {
    await db.$disconnect();
  }
}
seed().catch(() => {
  process.stderr.write("Seed failed; check configuration and bootstrap administrator.\n");
  process.exitCode = 1;
});
