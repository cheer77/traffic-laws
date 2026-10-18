export interface ApiConfig {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  port: number;
  host: string;
  corsOrigins: string[];
  sessionTtlSeconds: number;
  swaggerEnabled: boolean;
}
export const API_CONFIG = Symbol("API_CONFIG");
export function readConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) throw new Error("Invalid NODE_ENV");
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const raw = env[name] ?? String(fallback);
    if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}`);
    const value = Number(raw);
    if (value < min || value > max) throw new Error(`Invalid ${name}`);
    return value;
  };
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("DATABASE_URL is required");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.username ||
    !url.password ||
    url.pathname.length < 2
  )
    throw new Error("Invalid DATABASE_URL");
  const parameters = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (!["sslmode", "sslrootcert"].includes(key) || parameters.has(key))
      throw new Error("Invalid DATABASE_URL parameters");
    parameters.add(key);
  }
  if (url.hash || !url.hostname) throw new Error("Invalid DATABASE_URL");
  if (nodeEnv === "production" && env.NODE_TLS_REJECT_UNAUTHORIZED === "0")
    throw new Error("TLS verification must remain enabled");
  if (nodeEnv === "production" && url.searchParams.get("sslmode") !== "verify-full")
    throw new Error("Production DATABASE_URL requires sslmode=verify-full");
  const corsOrigins = (env.CORS_ORIGINS ?? "").split(",").filter(Boolean);
  for (const origin of corsOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("Invalid CORS_ORIGINS");
    }
    if (
      parsed.origin !== origin ||
      !["http:", "https:"].includes(parsed.protocol) ||
      (nodeEnv === "production" && parsed.protocol !== "https:")
    )
      throw new Error("Invalid CORS_ORIGINS");
  }
  if (env.SWAGGER_ENABLED !== undefined && !["true", "false"].includes(env.SWAGGER_ENABLED))
    throw new Error("Invalid SWAGGER_ENABLED");
  const host = env.HOST ?? "127.0.0.1";
  if (!["127.0.0.1", "0.0.0.0", "::1"].includes(host)) throw new Error("Invalid HOST");
  return {
    nodeEnv: nodeEnv === "production" ? "production" : nodeEnv === "test" ? "test" : "development",
    databaseUrl: url.toString(),
    port: integer("PORT", 3002, 1, 65535),
    host,
    corsOrigins,
    sessionTtlSeconds: integer("SESSION_TTL_SECONDS", 3600, 60, 86400),
    swaggerEnabled:
      env.SWAGGER_ENABLED === "true" ||
      (env.SWAGGER_ENABLED === undefined && nodeEnv === "development"),
  };
}
