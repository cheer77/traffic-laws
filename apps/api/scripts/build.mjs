import { build } from "esbuild";
import { readFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
export const options = {
  entryPoints: ["src/main.ts", "src/openapi.ts", "src/seed.ts", "src/bootstrap-admin.ts"],
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  external: Object.keys(manifest.dependencies).filter((name) => !name.startsWith("@traffic-laws/")),
  sourcemap: false,
  logLevel: "info",
};
await build(options);
