import { describe, expect, it } from "vitest";
import { readConfig } from "./config";
const env = { DATABASE_URL: "postgresql://local:generated@127.0.0.1:5433/test" };
describe("fail-closed configuration", () => {
  it("accepts explicit local configuration", () => {
    expect(readConfig(env)).toMatchObject({
      port: 3002,
      host: "127.0.0.1",
      sessionTtlSeconds: 3600,
      corsOrigins: [],
    });
  });
  it.each([
    {},
    { ...env, DATABASE_URL: env.DATABASE_URL + "?sslmode=verify-full&sslmode=no-verify" },
    { ...env, DATABASE_URL: env.DATABASE_URL + "?host=other" },
    {
      ...env,
      NODE_ENV: "production",
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      DATABASE_URL: env.DATABASE_URL + "?sslmode=verify-full",
    },
    { ...env, PORT: "3oops" },
    { ...env, SESSION_TTL_SECONDS: "0" },
    { ...env, CORS_ORIGINS: "*" },
    { ...env, NODE_ENV: "staging" },
    { ...env, SWAGGER_ENABLED: "yes" },
    { ...env, NODE_ENV: "production" },
    { ...env, CORS_ORIGINS: "http://localhost:3000/" },
  ])("rejects invalid configuration", (input) => {
    expect(() => readConfig(input)).toThrow();
  });
  it("requires TLS for production DB and allowed origins", () => {
    expect(
      readConfig({
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: env.DATABASE_URL + "?sslmode=verify-full",
        CORS_ORIGINS: "https://example.org",
      }).swaggerEnabled,
    ).toBe(false);
  });
});
