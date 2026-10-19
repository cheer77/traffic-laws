import { describe, expect, it } from "vitest";
import { isUiPreviewRequestAllowed } from "./index";

describe("UI Preview request boundary", () => {
  it.each(["localhost:3000", "127.0.0.1:3003", "[::1]:3001"])(
    "allows a development request on %s by default",
    (host) =>
      expect(isUiPreviewRequestAllowed({ nodeEnv: "development", enabled: undefined, host })).toBe(
        true,
      ),
  );

  it("cannot be enabled in production", () => {
    expect(
      isUiPreviewRequestAllowed({ nodeEnv: "production", enabled: "true", host: "localhost" }),
    ).toBe(false);
  });

  it.each(["traffic-laws.example", "localhost.example", "127.0.0.1.example", null])(
    "rejects a non-loopback or missing host: %s",
    (host) =>
      expect(isUiPreviewRequestAllowed({ nodeEnv: "development", enabled: "true", host })).toBe(
        false,
      ),
  );

  it("supports an explicit local opt-out for authentication testing", () => {
    expect(
      isUiPreviewRequestAllowed({ nodeEnv: "development", enabled: "false", host: "localhost" }),
    ).toBe(false);
  });
});
