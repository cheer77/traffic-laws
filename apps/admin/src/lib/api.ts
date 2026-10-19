import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "./contracts";
import { isUiPreview, uiPreviewApiResponse } from "./ui-preview";

export const COOKIE_NAME = "admin_session";
const API_BASE = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3002";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid API path");
  if (await isUiPreview()) return (await uiPreviewApiResponse(path, init)) as T;
  const bearer = token ?? (await cookies()).get(COOKIE_NAME)?.value;
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
        ? data.error.message
        : "Запит не виконано";
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}
export async function requireStaff(): Promise<Profile> {
  if (await isUiPreview()) return (await uiPreviewApiResponse("/users/me", {})) as Profile;
  if (!(await cookies()).has(COOKIE_NAME)) redirect("/login");
  try {
    const profile = await apiFetch<Profile>("/users/me");
    if (profile.status !== "active" || !["reviewer", "admin"].includes(profile.role))
      redirect("/forbidden");
    return profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?expired=1");
    throw error;
  }
}
