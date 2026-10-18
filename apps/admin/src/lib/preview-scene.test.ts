import { describe, expect, it } from "vitest";
import { createScene } from "@traffic-laws/scene-engine";
import { previewScene } from "./preview-scene";

describe("Admin scene boundary", () => {
  it("accepts a valid shared-engine scene", () => {
    expect(previewScene(createScene()).scene).toEqual(createScene());
  });
  it("handles a missing scene", () => {
    expect(previewScene(null)).toEqual({ scene: null, invalid: false });
  });
  it("rejects an invalid scene without rendering", () => {
    expect(previewScene({ schemaVersion: 999 })).toEqual({ scene: null, invalid: true });
  });
});
