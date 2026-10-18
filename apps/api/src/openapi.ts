import { mkdir, writeFile } from "node:fs/promises";
import { createApplication } from "./application";
import { readConfig } from "./config/config";
async function generate() {
  const { app, document } = await createApplication(
    readConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/openapi",
    }),
    false,
  );
  await mkdir("dist", { recursive: true });
  await writeFile("dist/openapi.json", JSON.stringify(document, null, 2));
  await app.close();
}
generate().catch(() => {
  process.stderr.write("OpenAPI generation failed\n");
  process.exitCode = 1;
});
