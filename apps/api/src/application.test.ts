import { describe, expect, it } from "vitest";
import { createApplication } from "./application";
import { readConfig } from "./config/config";
describe("bootstrap and API contract", () => {
  it("constructs all modules and versioned documented routes without opening a DB", async () => {
    const { app, document } = await createApplication(
      readConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://test:test@127.0.0.1:1/unavailable",
      }),
      false,
    );
    try {
      expect(document.paths["/api/v1/auth/login"].post?.requestBody).toBeDefined();
      expect(document.paths["/api/v1/internal/scenarios"].get?.security).toEqual([{ bearer: [] }]);
      expect(document.paths["/api/v1/internal/scenarios/{id}/revisions"].get?.security).toEqual([
        { bearer: [] },
      ]);
      expect(document.paths["/api/v1/progress/attempts"].post?.security).toEqual([{ bearer: [] }]);
      expect(
        document.paths["/api/v1/scenarios/{id}/revisions/{revision}"].get?.security,
      ).toBeUndefined();
      expect(
        document.paths["/api/v1/internal/scenarios/{id}/revisions/{revision}/unpublish"].post
          ?.responses[201],
      ).toBeDefined();
      expect(
        JSON.stringify(
          document.paths["/api/v1/scenarios/{id}/revisions/{revision}"].get?.responses[200],
        ),
      ).not.toContain("correctAnswerId");
      expect(
        document.paths["/api/v1/internal/scenarios/{id}/revisions/{revision}/publish"].post
          ?.responses[201],
      ).toBeDefined();
      for (const [path, item] of Object.entries(document.paths)) {
        if (!path.includes("{revision}")) continue;
        const operation = item.get ?? item.post;
        expect(
          operation?.parameters?.filter(
            (parameter) => "in" in parameter && parameter.in === "path",
          ),
        ).toEqual([
          expect.objectContaining({ name: "id", in: "path", required: true }),
          expect.objectContaining({
            name: "revision",
            in: "path",
            required: true,
            schema: expect.objectContaining({ type: "integer", minimum: 1 }),
          }),
        ]);
      }
      expect(document.paths["/api/v1/health/ready"].get).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
