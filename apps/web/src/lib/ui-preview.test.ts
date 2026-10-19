import { afterEach, describe, expect, it, vi } from "vitest";
const incoming = vi.hoisted(() => ({ host: "localhost:3000" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: incoming.host }) }));
import { isUiPreview, uiPreviewApiResponse } from "./ui-preview";

afterEach(() => vi.unstubAllEnvs());
describe("school preview boundary", () => {
  it("permits loopback development only", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UI_PREVIEW", "true");
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
      incoming.host = host;
      expect(await isUiPreview()).toBe(true);
    }
    for (const host of ["school.example", "localhost.example", "192.168.1.10:3000"]) {
      incoming.host = host;
      expect(await isUiPreview()).toBe(false);
    }
  });
  it("cannot be enabled in production and respects explicit local opt-out", async () => {
    incoming.host = "localhost:3000";
    vi.stubEnv("UI_PREVIEW", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(await isUiPreview()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UI_PREVIEW", "false");
    expect(await isUiPreview()).toBe(false);
  });
  it("keeps only the preview identity adapter, not a duplicate ticket feed", async () => {
    expect(await uiPreviewApiResponse("/users/me")).toHaveProperty("status", "active");
    await expect(uiPreviewApiResponse("/scenarios")).rejects.toThrow();
  });
});
