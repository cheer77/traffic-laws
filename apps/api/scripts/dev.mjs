import { spawn } from "node:child_process";
import { context } from "esbuild";
import { options } from "./build.mjs";
let child;
const ctx = await context({
  ...options,
  plugins: [
    {
      name: "restart",
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length) return;
          if (child && child.exitCode === null) {
            const exited = new Promise((resolve) => child.once("exit", resolve));
            child.kill("SIGTERM");
            await exited;
          }
          child = spawn(process.execPath, ["dist/main.cjs"], {
            stdio: "inherit",
            env: process.env,
          });
        });
      },
    },
  ],
});
await ctx.watch();
async function stop() {
  child?.kill("SIGTERM");
  await ctx.dispose();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
