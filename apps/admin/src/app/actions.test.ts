import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  assertSameOrigin: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set, get: mocks.get, delete: mocks.delete }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security", () => ({ assertSameOrigin: mocks.assertSameOrigin }));
vi.mock("@/lib/api", () => ({
  apiFetch: mocks.apiFetch,
  COOKIE_NAME: "admin_session",
  requireStaff: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { loginAction, logoutAction, saveScenarioAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertSameOrigin.mockResolvedValue(undefined);
});

describe("Admin server action security", () => {
  it("sets an expiring Secure, HttpOnly, Strict cookie only after staff verification", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const token = "a".repeat(43);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    mocks.apiFetch
      .mockResolvedValueOnce({ accessToken: token, expiresAt })
      .mockResolvedValueOnce({ id: "id", role: "admin", status: "active" });
    const form = new FormData();
    form.set("email", "admin@example.org");
    form.set("password", "admin test-only passphrase");
    await expect(loginAction({ error: null }, form)).rejects.toThrow("redirect:/");
    expect(mocks.apiFetch).toHaveBeenNthCalledWith(2, "/users/me", {}, token);
    expect(mocks.set).toHaveBeenCalledWith("admin_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      expires: new Date(expiresAt),
    });
    vi.unstubAllEnvs();
  });
  it("clears the local cookie and warns when remote revocation fails", async () => {
    mocks.get.mockReturnValue({ value: "a".repeat(43) });
    mocks.apiFetch.mockRejectedValue(new Error("API unavailable"));
    await expect(logoutAction()).rejects.toThrow("redirect:/login?logout=partial");
    expect(mocks.delete).toHaveBeenCalledWith("admin_session");
  });
  it("rejects protected mutations before reading or sending data when origin is invalid", async () => {
    mocks.assertSameOrigin.mockRejectedValue(new Error("Недозволене джерело запиту"));
    expect((await saveScenarioAction({ error: null }, new FormData())).error).toContain(
      "Недозволене",
    );
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });
});
