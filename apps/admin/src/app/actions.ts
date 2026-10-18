"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateScenario } from "@traffic-laws/scenarios";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { apiFetch, ApiError, COOKIE_NAME, requireStaff } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security";
import type { Profile } from "@/lib/contracts";

export interface FormState {
  error: string | null;
  success?: string;
}
const failed = (error: unknown): FormState => ({
  error:
    error instanceof ApiError
      ? error.status === 401
        ? "Невірні облікові дані або сеанс завершився."
        : error.status === 403
          ? "Дію заборонено для цього облікового запису."
          : error.status === 409
            ? "Ревізія вже змінилася. Оновіть сторінку перед повторним збереженням."
            : `Помилка API (HTTP ${error.status}).`
      : error instanceof Error
        ? error.message
        : "Запит не виконано",
});
export async function loginAction(_state: FormState, data: FormData): Promise<FormState> {
  try {
    await assertSameOrigin();
    const email = data.get("email"),
      password = data.get("password");
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.includes("@") ||
      password.length < 15
    )
      return { error: "Введіть адресу електронної пошти та пароль (щонайменше 15 символів)." };
    const session = await apiFetch<{ accessToken: string; expiresAt: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!/^[A-Za-z0-9_-]{43}$/.test(session.accessToken))
      return { error: "Некоректна відповідь сервера." };
    let profile: Profile;
    try {
      profile = await apiFetch<Profile>("/users/me", {}, session.accessToken);
    } catch (error) {
      await apiFetch("/auth/logout", { method: "POST" }, session.accessToken).catch(
        () => undefined,
      );
      throw error;
    }
    if (profile.status !== "active" || !["admin", "reviewer"].includes(profile.role)) {
      await apiFetch("/auth/logout", { method: "POST" }, session.accessToken).catch(
        () => undefined,
      );
      return { error: "Доступ до адміністрування заборонено." };
    }
    const expiry = new Date(session.expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      await apiFetch("/auth/logout", { method: "POST" }, session.accessToken).catch(
        () => undefined,
      );
      return { error: "Сеанс уже завершився." };
    }
    (await cookies()).set(COOKIE_NAME, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: expiry,
    });
  } catch (error) {
    return failed(error);
  }
  redirect("/");
}
export async function logoutAction(): Promise<void> {
  await assertSameOrigin();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  let revocationFailed = false;
  if (token)
    await apiFetch("/auth/logout", { method: "POST" }, token).catch(() => {
      revocationFailed = true;
    });
  cookieStore.delete(COOKIE_NAME);
  redirect(revocationFailed ? "/login?logout=partial" : "/login");
}
export async function saveScenarioAction(_state: FormState, data: FormData): Promise<FormState> {
  let target = "";
  try {
    await assertSameOrigin();
    await requireStaff();
    const json = data.get("payload"),
      expected = data.get("expectedRevision");
    if (
      typeof json !== "string" ||
      json.length > 1_000_000 ||
      typeof expected !== "string" ||
      !/^\d+$/.test(expected)
    )
      return { error: "Некоректний JSON або номер попередньої ревізії." };
    const payload: unknown = JSON.parse(json);
    const scenario = validateScenario(payload, { rules: UA_PDR_REFERENCES });
    const expectedRevision = Number(expected);
    if (scenario.revision !== expectedRevision + 1)
      return { error: "Номер нової ревізії має дорівнювати попередній + 1." };
    if (scenario.contentStatus.state !== "draft" && scenario.contentStatus.state !== "in_review")
      return { error: "Зберігати можна лише чернетку або матеріал на перевірці." };
    await apiFetch("/internal/scenarios/revisions", {
      method: "POST",
      body: JSON.stringify({ payload: scenario, expectedRevision }),
    });
    target = `/scenarios/${encodeURIComponent(scenario.id)}/${scenario.revision}`;
  } catch (error) {
    if (error instanceof SyntaxError)
      return { error: "JSON має синтаксичну помилку. Перевірте дужки, коми та лапки." };
    return failed(error);
  }
  revalidatePath("/scenarios");
  redirect(target);
}
export async function reviewAction(
  id: string,
  revision: number,
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await assertSameOrigin();
    const profile = await requireStaff();
    if (profile.role !== "reviewer" && profile.role !== "admin")
      return { error: "Доступ заборонено." };
    const decision = data.get("decision"),
      evidence = data.get("evidence");
    if (
      decision !== "recommend_approval" &&
      decision !== "changes_requested" &&
      decision !== "rejected"
    )
      return { error: "Оберіть рішення." };
    if (typeof evidence !== "string" || evidence.trim().length < 10 || evidence.length > 2000)
      return { error: "Обґрунтування має містити від 10 до 2000 символів." };
    await apiFetch(`/internal/scenarios/${encodeURIComponent(id)}/revisions/${revision}/reviews`, {
      method: "POST",
      body: JSON.stringify({ decision, evidence: evidence.trim() }),
    });
  } catch (error) {
    return failed(error);
  }
  revalidatePath(`/scenarios/${encodeURIComponent(id)}/${revision}`);
  return { error: null, success: "Рекомендацію збережено для цієї ревізії." };
}
export async function publicationAction(
  mode: "publish" | "unpublish",
  id: string,
  revision: number,
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await assertSameOrigin();
    const profile = await requireStaff();
    if (profile.role !== "admin") return { error: "Публікувати може лише адміністратор." };
    const evidence = data.get("evidence");
    const confirmation = data.get("confirmation");
    if (confirmation !== mode) return { error: "Підтвердьте дію, ввівши контрольне слово." };
    if (typeof evidence !== "string" || evidence.trim().length < 10 || evidence.length > 500)
      return { error: "Обґрунтування має містити від 10 до 500 символів." };
    await apiFetch(`/internal/scenarios/${encodeURIComponent(id)}/revisions/${revision}/${mode}`, {
      method: "POST",
      body: JSON.stringify({ evidence: evidence.trim() }),
    });
  } catch (error) {
    return failed(error);
  }
  revalidatePath(`/scenarios/${encodeURIComponent(id)}/${revision}`);
  revalidatePath("/scenarios");
  return {
    error: null,
    success:
      mode === "publish"
        ? "Ревізію опубліковано для учнів. Дію записано в аудит."
        : "Ревізію знято з публікації. Дію записано в аудит.",
  };
}

export async function syncQuestionsAction(_state: FormState, _data: FormData): Promise<FormState> {
  void _state;
  void _data;
  try {
    await assertSameOrigin();
    const profile = await requireStaff();
    if (profile.role !== "admin") return { error: "Імпорт доступний лише адміністратору." };
    await apiFetch("/internal/imports/sync", { method: "POST" });
  } catch (error) {
    return failed(error);
  }
  revalidatePath("/");
  revalidatePath("/imports");
  return {
    error: null,
    success: "Джерело перевірено. Результат і причину блокування записано в журнал.",
  };
}
