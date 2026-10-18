import { expect, test, type Page } from "@playwright/test";

const api = process.env.ADMIN_TEST_API_URL;
if (!api) throw new Error("ADMIN_TEST_API_URL is required; use pnpm test:admin:integration");
const adminPassword = "admin test-only passphrase";
const studentPassword = "test-only long passphrase";

async function login(page: Page, email: string, password = adminPassword, staff = true) {
  await page.goto("/login");
  await page.getByLabel("Електронна пошта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Увійти" }).click();
  if (staff) await expect(page.getByRole("heading", { name: "Огляд" })).toBeVisible();
}

test("protected pages reject anonymous access", async ({ page }) => {
  for (const path of ["/", "/scenarios", "/scenarios/new", "/imports", "/account"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("forged cross-origin server action cannot establish a session", async ({ page, context }) => {
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST") {
      const response = await route.fetch({
        headers: { ...route.request().headers(), origin: "https://evil.example.org" },
      });
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.goto("/login");
  await page.getByLabel("Електронна пошта").fill("admin@example.org");
  await page.getByLabel("Пароль").fill(adminPassword);
  const refused = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/login",
  );
  await page.getByRole("button", { name: "Увійти" }).click();
  await refused;
  await expect(page.getByRole("heading", { name: "Адміністрування ПДР" })).toBeVisible();
  expect((await context.cookies()).some((item) => item.name === "admin_session")).toBe(false);
});

test("administrator and reviewer login, secure cookie attributes and logout", async ({
  page,
  context,
}) => {
  for (const email of ["admin@example.org", "reviewer@example.org"]) {
    await login(page, email);
    await page.goto("/account");
    await expect(page.getByText(email)).toBeVisible();
    const cookie = (await context.cookies()).find((item) => item.name === "admin_session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("Strict");
    expect(cookie?.path).toBe("/");
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
    const html = await page.content();
    expect(html).not.toContain(cookie?.value);
    expect(html).not.toContain(adminPassword);
    await page.getByRole("button", { name: "Вийти" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.cookies()).some((item) => item.name === "admin_session")).toBe(false);
  }
});

test("student and disabled reviewer are denied", async ({ page, context }) => {
  for (const [email, password, message] of [
    ["student@example.org", studentPassword, "Доступ до адміністрування заборонено"],
    ["disabled-admin-qa@example.org", adminPassword, "Невірні облікові дані"],
  ]) {
    await login(page, email, password, false);
    await expect(page.locator("main [role=alert]")).toContainText(message);
    expect((await context.cookies()).some((item) => item.name === "admin_session")).toBe(false);
  }
});

test("revoked session redirects and browser expiry drops the cookie", async ({
  page,
  context,
  request,
}) => {
  await login(page, "admin@example.org");
  const cookie = (await context.cookies()).find((item) => item.name === "admin_session");
  expect(cookie).toBeDefined();
  const revoked = await request.post(`${api}/auth/logout`, {
    headers: { Authorization: `Bearer ${cookie?.value}` },
  });
  expect(revoked.status()).toBe(200);
  await page.goto("/scenarios");
  await expect(page).toHaveURL(/\/login\?expired=1/);
  await expect(page.locator("main [role=alert]")).toContainText("Сеанс завершився");
  await context.clearCookies();
  await page.goto("/scenarios");
  await expect(page).toHaveURL(/\/login$/);
});

test("real staff list filters and pagination; scene loads lazily", async ({ page }) => {
  await login(page, "admin@example.org");
  await page.goto("/scenarios");
  await expect(page.getByRole("heading", { name: "Сценарії" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByLabel("Пошук за ID сценарію").fill("draft-ua");
  await page.getByLabel("Статус").selectOption("in_review");
  await page.getByRole("button", { name: "Застосувати" }).click();
  await expect(page).toHaveURL(/q=draft-ua/);
  await expect(page).toHaveURL(/status=in_review/);
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const rows = page.locator("tbody tr");
  for (let index = 0; index < (await rows.count()); index++) {
    await expect(rows.nth(index)).toContainText("draft-ua");
    await expect(rows.nth(index)).toContainText("На перевірці");
  }
  await page.goto("/scenarios?page=200&q=definitely-absent");
  await expect(page.getByText("На цій сторінці сценаріїв не знайдено.")).toBeVisible();
  await page.goto("/scenarios/draft-ua-red-signal/1");
  await expect(page.getByRole("heading", { name: "Перегляд сцени" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("не перевірено незалежно").first()).toBeVisible();
  await expect(page.getByLabel("Обґрунтування рішення власника")).toBeVisible();
});

test("draft validation, immutable revision and stale edit conflict", async ({ page, request }) => {
  await login(page, "admin@example.org");
  await page.goto("/scenarios/new");
  const id = `admin-e2e-${Date.now()}`;
  const payload = {
    schemaVersion: 1,
    revision: 1,
    id,
    country: "UA",
    language: "uk",
    category: "Навчальний сценарій",
    question: "Автоматизована перевірка чернетки",
    answers: [
      { id: "answer-1", text: "А" },
      { id: "answer-2", text: "Б" },
    ],
    correctAnswerId: "answer-1",
    explanation: "Тестове пояснення",
    ruleReferences: [],
    sceneReference: null,
    contentStatus: { state: "draft" },
  };
  await page.getByLabel("Технічний ID").fill(id);
  await page.getByLabel("Категорія").fill(payload.category);
  await page.getByLabel("Запитання").fill(payload.question);
  await page.getByPlaceholder("Варіант 1 (обов’язково)").fill("А");
  await page.getByPlaceholder("Варіант 2 (обов’язково)").fill("Б");
  await page.getByLabel("Пояснення після відповіді").fill(payload.explanation);
  await page.getByRole("button", { name: "Створити незмінну ревізію" }).click();
  await expect(page).toHaveURL(new RegExp(`/scenarios/${id}/1$`));
  await expect(page.getByText("Автор не може рецензувати власну ревізію.")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  const next = { ...payload, revision: 2, question: "Друга незмінна ревізія" };
  await page.getByLabel("Сценарій JSON v1").fill(JSON.stringify(next));
  await page.getByRole("button", { name: "Зберегти ревізію" }).click();
  await expect(page).toHaveURL(new RegExp(`/scenarios/${id}/2$`));
  await expect(page.getByRole("link", { name: "Ревізія 1" })).toBeVisible();
  await page.getByRole("link", { name: "Ревізія 1" }).click();
  await expect(page.getByRole("heading", { name: payload.question })).toBeVisible();
  await page.goto(`/scenarios/${id}/2`);
  const token = (await page.context().cookies()).find(
    (item) => item.name === "admin_session",
  )?.value;
  const stale = await request.post(`${api}/internal/scenarios/revisions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { payload: { ...next, revision: 3 }, expectedRevision: 1 },
  });
  expect(stale.status()).toBe(409);
  const forbidden = await request.post(`${api}/internal/scenarios/${id}/revisions/2/publish`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(forbidden.status()).toBe(400);
});

test("reviewer submits recommendation but cannot publish", async ({ page, request }) => {
  await login(page, "reviewer@example.org");
  await page.goto("/imports");
  await expect(page.getByRole("heading", { name: "Імпорт офіційних питань" })).toBeVisible();
  await expect(page.getByText("Автопублікацію призупинено")).toBeVisible();
  await expect(page.getByRole("button", { name: "Імпортувати / Оновити питання" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Журнал імпорту" })).toBeVisible();
  await page.goto("/scenarios");
  const links = page.locator("tbody tr a");
  await links.first().click();
  const reviewButton = page.getByRole("button", { name: "Надіслати рекомендацію" });
  await expect(reviewButton).toBeVisible();
  await page
    .getByLabel("Обґрунтування та посилання на докази")
    .fill("Автоматизована рекомендація; юридична перевірка не виконана.");
  await reviewButton.click();
  await expect(page.getByRole("status")).toContainText("Рекомендацію збережено");
  const token = (await page.context().cookies()).find(
    (item) => item.name === "admin_session",
  )?.value;
  const path = new URL(page.url()).pathname.split("/");
  const forbidden = await request.post(
    `${api}/internal/scenarios/${path[2]}/revisions/${path[3]}/publish`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(forbidden.status()).toBe(403);
});
