import pg from "pg";
import { pathToFileURL } from "node:url";
export async function provisionRuntime(ownerUrl, password, reuseExisting = false) {
  if (!reuseExisting && (typeof password !== "string" || password.length < 32))
    throw new Error("Use a generated runtime password of at least 32 characters");
  const db = new pg.Client({ connectionString: ownerUrl });
  await db.connect();
  try {
    await db.query("BEGIN");
    const existing = await db.query(
      "SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname = 'traffic_runtime'",
    );
    if (reuseExisting) {
      if (existing.rowCount !== 1 || Object.values(existing.rows[0]).some(Boolean))
        throw new Error("Expected an existing restricted runtime role");
      if (
        (
          await db.query(
            "SELECT 1 FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname='traffic_runtime')",
          )
        ).rowCount
      )
        throw new Error("Runtime role must not inherit other roles");
    } else {
      if (existing.rowCount) throw new Error("Runtime role already exists; rotate separately");
      await db.query(
        `CREATE ROLE traffic_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD ${db.escapeLiteral(password)}`,
      );
    }
    const database = (await db.query("SELECT current_database() AS name")).rows[0].name;
    await db.query(`REVOKE ALL ON DATABASE ${db.escapeIdentifier(database)} FROM PUBLIC`);
    await db.query(`GRANT CONNECT ON DATABASE ${db.escapeIdentifier(database)} TO traffic_runtime`);
    await db.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    await db.query("GRANT USAGE ON SCHEMA public TO traffic_runtime");
    await db.query(
      'REVOKE ALL ON "User", "Session", "ScenarioRevision", "Review", "Attempt", "AuditEvent", "Publication" FROM traffic_runtime',
    );
    await db.query('GRANT SELECT, INSERT ON "User", "Session" TO traffic_runtime');
    await db.query('GRANT UPDATE ("revokedAt") ON "Session" TO traffic_runtime');
    await db.query(
      'GRANT SELECT, INSERT ON "ScenarioRevision", "Review", "Attempt", "AuditEvent" TO traffic_runtime',
    );
    await db.query('GRANT SELECT ON "Publication" TO traffic_runtime');
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  provisionRuntime(
    process.env.MIGRATION_DATABASE_URL,
    process.env.RUNTIME_DATABASE_PASSWORD,
    process.argv.includes("--grant-existing"),
  )
    .then(() => console.log("Restricted runtime role created"))
    .catch(() => {
      console.error(
        "Runtime role provisioning failed; check owner connection, password and existing role",
      );
      process.exitCode = 1;
    });
}
