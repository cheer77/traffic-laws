"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError, COOKIE_NAME, requireStudent } from "@/lib/api";
import { assertSameOrigin } from "@/lib/same-origin";
import type { AttemptFeedback } from "@/lib/contracts";
export interface FormState {
  error: string | null;
  feedback?: AttemptFeedback;
}
const message = (error: unknown) =>
  error instanceof ApiError
    ? error.status === 401
      ? "Невірна електронна пошта або пароль."
      : error.status === 409
        ? "Обліковий запис із цією адресою вже існує."
        : "Сервіс тимчасово недоступний. Спробуйте ще раз."
    : "Не вдалося виконати дію.";
async function createSession(email: string, password: string) {
  const session = await apiFetch<{ accessToken: string; expiresAt: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!/^[A-Za-z0-9_-]{43}$/.test(session.accessToken)) throw new Error("Invalid session");
  const expiry = new Date(session.expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now())
    throw new Error("Expired session");
  (await cookies()).set(COOKIE_NAME, session.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiry,
  });
}
function credentials(data: FormData): { email: string; password: string } | null {
  const email = data.get("email"),
    password = data.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.includes("@") ||
    password.length < 15
  )
    return null;
  return { email: email.trim().toLowerCase(), password };
}
export async function loginAction(_state: FormState, data: FormData): Promise<FormState> {
  try {
    await assertSameOrigin();
    const input = credentials(data);
    if (!input) return { error: "Введіть коректну адресу та пароль щонайменше з 15 символів." };
    await createSession(input.email, input.password);
  } catch (error) {
    return { error: message(error) };
  }
  redirect("/school");
}
export async function registerAction(_state: FormState, data: FormData): Promise<FormState> {
  try {
    await assertSameOrigin();
    const input = credentials(data);
    if (!input) return { error: "Введіть коректну адресу та пароль щонайменше з 15 символів." };
    if (data.get("consent") !== "on")
      return { error: "Підтвердьте згоду з умовами навчального MVP." };
    await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(input) });
    await createSession(input.email, input.password);
  } catch (error) {
    return { error: message(error) };
  }
  redirect("/school");
}
export async function logoutAction() {
  await assertSameOrigin();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await apiFetch("/auth/logout", { method: "POST" }, token).catch(() => undefined);
  store.delete(COOKIE_NAME);
  redirect("/");
}
export async function submitAttemptAction(
  id: string,
  revision: number,
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await assertSameOrigin();
    await requireStudent();
    const answerId = data.get("answerId");
    if (typeof answerId !== "string") return { error: "Оберіть один варіант відповіді." };
    const feedback = await apiFetch<AttemptFeedback>("/progress/attempts", {
      method: "POST",
      body: JSON.stringify({ scenarioId: id, revision, answerId }),
    });
    revalidatePath("/school");
    return { error: null, feedback };
  } catch (error) {
    return { error: message(error) };
  }
}
