import { spawn, spawnSync } from "node:child_process";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as createHttpsServer } from "node:https";
import { request as httpRequest } from "node:http";
import pg from "pg";
import { provisionRuntime } from "./runtime-role.mjs";
const suffix = randomBytes(8).toString("hex");
const container = `traffic-api-test-${suffix}`,
  database = `traffic_test_${suffix}`,
  recovery = `traffic_restore_${suffix}`;
const password = randomBytes(32).toString("hex"),
  runtimePassword = randomBytes(32).toString("hex");
const dockerEnv = { ...process.env, POSTGRES_PASSWORD: password };
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  return result.stdout;
}
async function runAsync(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  if (code !== 0) throw new Error(`${command} failed: ${output}`);
  return output;
}
const docker = (args, options = {}) => run("docker", args, { env: dockerEnv, ...options });
let api, admin, adminProxy, dev, owner, restored, certificateDirectory;
const proxySockets = new Set();
async function closeProxy() {
  if (!adminProxy) return;
  for (const socket of proxySockets) socket.destroy();
  adminProxy.closeAllConnections();
  await new Promise((resolve) => adminProxy.close(resolve));
  adminProxy = undefined;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await exited;
}
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API did not become ready");
}
async function availablePort() {
  const { createServer } = await import("node:net");
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Port unavailable");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}
async function snapshot(client) {
  const result = {};
  for (const table of [
    "User",
    "Session",
    "ScenarioRevision",
    "Review",
    "Publication",
    "Attempt",
    "AuditEvent",
    "ImportRun",
  ]) {
    result[table] = (
      await client.query(`SELECT to_jsonb(t) AS value FROM "${table}" t ORDER BY to_jsonb(t)::text`)
    ).rows;
  }
  return JSON.stringify(result);
}
try {
  console.log("Starting a disposable PostgreSQL 17 container; no existing DB URL is used.");
  docker([
    "run",
    "--detach",
    "--rm",
    "--name",
    container,
    "--env",
    "POSTGRES_PASSWORD",
    "--env",
    `POSTGRES_DB=${database}`,
    "--publish",
    "127.0.0.1::5432",
    "postgres:17.11-alpine",
  ]);
  const mapping = docker(["port", container, "5432/tcp"]).trim();
  const port = Number(mapping.split(":").at(-1));
  if (!Number.isInteger(port)) throw new Error("Invalid Docker port");
  const ownerUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}`;
  const runtimeUrl = `postgresql://traffic_runtime:${runtimePassword}@127.0.0.1:${port}/${database}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      docker(["exec", container, "pg_isready", "-U", "postgres", "-d", database]);
      ready = true;
      break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("PostgreSQL unavailable");
  const migrationEnv = { ...process.env, MIGRATION_DATABASE_URL: ownerUrl };
  console.log(run("pnpm", ["db:migrate"], { env: migrationEnv }));
  console.log(run("pnpm", ["db:migrate"], { env: migrationEnv }));
  console.log(run("pnpm", ["db:status"], { env: migrationEnv }));
  run(
    "pnpm",
    [
      "exec",
      "prisma",
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--exit-code",
    ],
    { env: migrationEnv },
  );
  owner = new pg.Client({ connectionString: ownerUrl });
  await owner.connect();
  const migrationFiles = [
    ["202610170001_foundation", "prisma/migrations/202610170001_foundation/migration.sql"],
    [
      "202610180002_owner_publication",
      "prisma/migrations/202610180002_owner_publication/migration.sql",
    ],
    ["202610180003_import_runs", "prisma/migrations/202610180003_import_runs/migration.sql"],
  ];
  const checksums = new Map(
    await Promise.all(
      migrationFiles.map(async ([name, path]) => [
        name,
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]),
    ),
  );
  const appliedMigrations = (
    await owner.query(
      'SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    )
  ).rows;
  if (
    appliedMigrations.length !== checksums.size ||
    appliedMigrations.some((row) => checksums.get(row.migration_name) !== row.checksum)
  )
    throw new Error("Migration checksum mismatch");
  await provisionRuntime(ownerUrl, runtimePassword);
  console.log(
    run("pnpm", ["exec", "vitest", "run", "test/database.test.ts"], {
      env: { ...process.env, API_TEST_DATABASE_URL: runtimeUrl, API_TEST_OWNER_URL: ownerUrl },
    }),
  );
  console.log(run("pnpm", ["build"]));
  console.log(run("pnpm", ["openapi"]));
  // Development seed is idempotent and cannot create publications, even with owner credentials.
  const beforeSeed = (await owner.query('SELECT count(*)::int AS count FROM "Publication"')).rows[0]
    .count;
  run("node", ["dist/seed.cjs"], {
    env: { ...process.env, NODE_ENV: "development", DATABASE_URL: runtimeUrl },
  });
  run("node", ["dist/seed.cjs"], {
    env: { ...process.env, NODE_ENV: "development", DATABASE_URL: runtimeUrl },
  });
  if (
    (await owner.query('SELECT count(*)::int AS count FROM "Publication"')).rows[0].count !==
    beforeSeed
  )
    throw new Error("Seed published content");
  // Exercise the actual production TLS policy using a disposable local CA certificate.
  certificateDirectory = await mkdtemp(join(tmpdir(), "traffic-api-tls-"));
  const keyFile = join(certificateDirectory, "server.key"),
    certificateFile = join(certificateDirectory, "server.crt");
  run("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyFile,
    "-out",
    certificateFile,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ]);
  docker(["cp", keyFile, `${container}:/tmp/traffic-api-server.key`]);
  docker(["cp", certificateFile, `${container}:/tmp/traffic-api-server.crt`]);
  docker([
    "exec",
    container,
    "chown",
    "postgres:postgres",
    "/tmp/traffic-api-server.key",
    "/tmp/traffic-api-server.crt",
  ]);
  docker(["exec", container, "chmod", "600", "/tmp/traffic-api-server.key"]);
  await owner.query("ALTER SYSTEM SET ssl_cert_file = '/tmp/traffic-api-server.crt'");
  await owner.query("ALTER SYSTEM SET ssl_key_file = '/tmp/traffic-api-server.key'");
  await owner.query("ALTER SYSTEM SET ssl = 'on'");
  await owner.query("SELECT pg_reload_conf()");
  const tlsUrl = new URL(runtimeUrl);
  tlsUrl.searchParams.set("sslmode", "verify-full");
  tlsUrl.searchParams.set("sslrootcert", certificateFile);
  let tlsReady = false;
  for (let i = 0; i < 30; i++) {
    const probe = new pg.Client({ connectionString: tlsUrl.toString() });
    try {
      await probe.connect();
      const result = await probe.query("SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()");
      tlsReady = result.rows[0].ssl;
    } catch {
    } finally {
      await probe.end();
    }
    if (tlsReady) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!tlsReady) throw new Error("Verified PostgreSQL TLS unavailable");

  const apiPort = await availablePort();
  const startEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: tlsUrl.toString(),
    PORT: String(apiPort),
    HOST: "127.0.0.1",
    SWAGGER_ENABLED: "true",
  };
  let productionLogs = "";
  api = spawn(process.execPath, ["dist/main.cjs"], {
    env: startEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  api.stdout.on("data", (data) => {
    productionLogs += data;
  });
  api.stderr.on("data", (data) => {
    productionLogs += data;
  });
  await waitFor(`http://127.0.0.1:${apiPort}/api/v1/health/ready`);
  if (process.argv.includes("--admin")) {
    const adminDirectory = join(process.cwd(), "../admin");
    await owner.query(
      `INSERT INTO "User" (id, email, "passwordHash", role, status, "createdAt", "updatedAt")
       SELECT $1, 'disabled-admin-qa@example.org', "passwordHash", 'reviewer', 'disabled', now(), now()
       FROM "User" WHERE email = 'admin@example.org'`,
      [randomUUID()],
    );
    console.log(
      run("node", ["scripts/check-contract.mjs", "../api/dist/openapi.json"], {
        cwd: adminDirectory,
      }),
    );
    console.log(
      run("pnpm", ["build"], {
        cwd: adminDirectory,
        env: { ...process.env, API_INTERNAL_URL: `http://127.0.0.1:${apiPort}` },
      }),
    );
    const adminPort = await availablePort();
    admin = spawn(
      "pnpm",
      ["exec", "next", "start", "--port", String(adminPort), "--hostname", "127.0.0.1"],
      {
        cwd: adminDirectory,
        env: {
          ...process.env,
          NODE_ENV: "production",
          API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`,
        },
        stdio: "ignore",
      },
    );
    await waitFor(`http://127.0.0.1:${adminPort}/login`);
    const proxyPort = await availablePort();
    adminProxy = createHttpsServer(
      { key: await readFile(keyFile), cert: await readFile(certificateFile) },
      (incoming, outgoing) => {
        const upstream = httpRequest(
          {
            hostname: "127.0.0.1",
            port: adminPort,
            path: incoming.url,
            method: incoming.method,
            headers: {
              ...incoming.headers,
              host: `127.0.0.1:${proxyPort}`,
              "x-forwarded-host": `127.0.0.1:${proxyPort}`,
              "x-forwarded-proto": "https",
            },
          },
          (response) => {
            outgoing.writeHead(response.statusCode ?? 502, response.headers);
            response.pipe(outgoing);
          },
        );
        upstream.on("error", () => outgoing.destroy());
        incoming.pipe(upstream);
      },
    );
    adminProxy.on("connection", (socket) => {
      proxySockets.add(socket);
      socket.once("close", () => proxySockets.delete(socket));
    });
    await new Promise((resolve) => adminProxy.listen(proxyPort, "127.0.0.1", resolve));
    console.log(
      await runAsync("pnpm", ["exec", "playwright", "test"], {
        cwd: adminDirectory,
        env: {
          ...process.env,
          ADMIN_TEST_BASE_URL: `https://127.0.0.1:${proxyPort}`,
          ADMIN_TEST_API_URL: `http://127.0.0.1:${apiPort}/api/v1`,
        },
      }),
    );
    await closeProxy();
    await stop(admin);
    admin = undefined;
  }
  if (process.argv.includes("--browser")) {
    console.log(
      `Browser verification: http://127.0.0.1:${apiPort}/api/docs — press Enter here to continue and remove the disposable database.`,
    );
    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.once("data", resolve);
    });
    process.stdin.pause();
  }
  await fetch(`http://127.0.0.1:${apiPort}/api/v1/health/live?password=never-log-me`, {
    headers: { Authorization: "Bearer never-log-me" },
  });
  await stop(api);
  await stop(admin);
  await closeProxy();
  api = undefined;
  if (
    !productionLogs.includes('"event":"http"') ||
    /never-log-me|password=|Authorization/.test(productionLogs) ||
    productionLogs.includes(password) ||
    productionLogs.includes(runtimePassword)
  )
    throw new Error("Unsafe or missing structured logging");
  const devPort = await availablePort();
  dev = spawn(process.execPath, ["scripts/dev.mjs"], {
    env: { ...startEnv, NODE_ENV: "development", DATABASE_URL: runtimeUrl, PORT: String(devPort) },
    stdio: "ignore",
  });
  await waitFor(`http://127.0.0.1:${devPort}/api/v1/health/ready`);
  await stop(dev);
  dev = undefined;
  const refused = spawnSync(process.execPath, ["dist/main.cjs"], {
    env: { ...startEnv, NODE_ENV: "test", DATABASE_URL: ownerUrl },
    encoding: "utf8",
    timeout: 10000,
  });
  if (refused.status !== 1 || !refused.stderr.includes("api.start_failed"))
    throw new Error("Owner startup was not rejected");
  const before = await snapshot(owner);
  const dump = docker(
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      database,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
    ],
    { encoding: null },
  );
  docker(["exec", container, "createdb", "-U", "postgres", recovery]);
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      recovery,
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
    ],
    { input: dump, encoding: null },
  );
  restored = new pg.Client({
    connectionString: `postgresql://postgres:${password}@127.0.0.1:${port}/${recovery}`,
  });
  await restored.connect();
  if ((await snapshot(restored)) !== before) throw new Error("Restored records differ");
  const restoredMigrations = (
    await restored.query(
      'SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    )
  ).rows;
  if (
    restoredMigrations.length !== checksums.size ||
    restoredMigrations.some((row) => checksums.get(row.migration_name) !== row.checksum)
  )
    throw new Error("Restored migration mismatch");
  let rejected = false;
  try {
    await restored.query('UPDATE "ScenarioRevision" SET revision = revision');
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Restored immutability trigger missing");
  const recoveryOwnerUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/${recovery}`;
  await provisionRuntime(recoveryOwnerUrl, undefined, true);
  const recoveryRuntimeUrl = new URL(tlsUrl);
  recoveryRuntimeUrl.pathname = `/${recovery}`;
  const recoveryPort = await availablePort();
  api = spawn(process.execPath, ["dist/main.cjs"], {
    env: { ...startEnv, PORT: String(recoveryPort), DATABASE_URL: recoveryRuntimeUrl.toString() },
    stdio: "ignore",
  });
  await waitFor(`http://127.0.0.1:${recoveryPort}/api/v1/health/ready`);
  const recoveredLogin = await fetch(`http://127.0.0.1:${recoveryPort}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@example.org", password: "test-only long passphrase" }),
  });
  if (recoveredLogin.status !== 200) throw new Error("Recovered login failed");
  const recoveredSession = await recoveredLogin.json();
  const recoveredProgress = await fetch(`http://127.0.0.1:${recoveryPort}/api/v1/progress`, {
    headers: { Authorization: `Bearer ${recoveredSession.accessToken}` },
  });
  const progress = await recoveredProgress.json();
  if (recoveredProgress.status !== 200 || progress.attempts !== 2 || progress.correct !== 1)
    throw new Error("Recovered learning history failed");
  await stop(api);
  api = undefined;
  console.log(
    "PASS: fresh/repeated migration, drift and checksum, HTTP integration, dev and production TLS startup, sanitized logs, owner-role refusal, seed idempotency, OpenAPI, full-record backup/restore, restored triggers and recovered authentication/progress.",
  );
} catch (error) {
  // Child diagnostics contain no passwords in tested tooling; redact defensively.
  console.error(
    String(error).replaceAll(password, "[redacted]").replaceAll(runtimePassword, "[redacted]"),
  );
  process.exitCode = 1;
} finally {
  await stop(api);
  await stop(dev);
  await owner?.end();
  await restored?.end();
  if (certificateDirectory) await rm(certificateDirectory, { recursive: true, force: true });
  try {
    docker(["rm", "--force", container]);
  } catch {}
}
