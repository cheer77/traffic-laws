import { defineConfig } from "prisma/config";
// Generation does not need a database. Migration commands require an explicit owner URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://invalid:invalid@127.0.0.1:1/unconfigured",
  },
});
