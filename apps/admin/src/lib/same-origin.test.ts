import { describe, expect, it } from "vitest";
import { sameOrigin } from "./same-origin";
describe("mutation origin gate", () => {
  it("requires the exact host and HTTPS in production", () => {
    expect(sameOrigin("https://admin.example.org", "admin.example.org", true)).toBe(true);
    expect(sameOrigin("http://admin.example.org", "admin.example.org", true)).toBe(false);
    expect(sameOrigin("https://evil.example.org", "admin.example.org", true)).toBe(false);
    expect(sameOrigin(null, "admin.example.org", true)).toBe(false);
    expect(sameOrigin("https://admin.example.org.evil", "admin.example.org", true)).toBe(false);
  });
  it("allows loopback HTTP in development only", () => {
    expect(sameOrigin("http://localhost:3003", "localhost:3003", false)).toBe(true);
    expect(sameOrigin("http://localhost:3004", "localhost:3003", false)).toBe(false);
  });
});
