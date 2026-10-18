import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
describe("password storage", () => {
  it("uses salted scrypt and rejects wrong/malformed credentials", async () => {
    const password = "a long unique test password";
    const first = await hashPassword(password),
      second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(first).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("wrong password", first)).toBe(false);
    expect(await verifyPassword(password, "scrypt$0$8$1$bad$bad")).toBe(false);
  });
});
