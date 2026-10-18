import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "./contracts";
export const COOKIE_NAME = "traffic_laws_session";
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
  if (!response.ok) throw new ApiError(response.status, "Запит не виконано");
  return response.json() as Promise<T>;
}
export async function currentProfile(): Promise<Profile | null> {
  if (!(await cookies()).has(COOKIE_NAME)) return null;
  try {
    return await apiFetch<Profile>("/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
export async function requireStudent(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect("/login?next=/school");
  if (profile.status !== "active") redirect("/login?disabled=1");
  return profile;
}
