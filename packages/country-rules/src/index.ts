export interface RuleSource {
  title: string;
  url: string;
  section: string;
  /** Date of the complete official edition, not necessarily this paragraph's enactment date. */
  editionDate?: string;
  /** Use only when this provision's effective date is known. */
  effectiveDate?: string;
  /** Date the source page was inspected; this is not legal verification. */
  retrievedAt?: string;
}

export type RuleVerification =
  | { status: "unverified" }
  | { status: "verified"; checkedAt: string; checkedBy: string; evidenceUrl: string };

export interface CountryRule {
  schemaVersion: 1;
  id: string;
  country: "UA";
  source: RuleSource | null;
  summary: string;
  verification: RuleVerification;
}

export class RuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleValidationError";
  }
}

function fail(path: string, message: string): never {
  throw new RuleValidationError(`${path}: ${message}`);
}
function object(input: unknown, path: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(path, "очікується об’єкт");
  return input as Record<string, unknown>;
}
function fields(input: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) fail(path, `невідоме поле «${key}»`);
}
function string(input: unknown, path: string, max = 500): string {
  if (typeof input !== "string" || !input.trim() || input.length > max)
    fail(path, `очікується непорожній текст до ${max} символів`);
  return input;
}
function date(input: unknown, path: string): string {
  const value = string(input, path, 10);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== value
  )
    fail(path, "очікується дата YYYY-MM-DD");
  return value;
}
function url(input: unknown, path: string): string {
  const value = string(input, path, 1000);
  try {
    if (new URL(value).protocol !== "https:") fail(path, "потрібне HTTPS-посилання");
  } catch {
    fail(path, "потрібне коректне HTTPS-посилання");
  }
  return value;
}

export function validateRule(input: unknown): CountryRule {
  const value = object(input, "Правило");
  fields(value, ["schemaVersion", "id", "country", "source", "summary", "verification"], "Правило");
  if (value.schemaVersion !== 1) fail("schemaVersion", "підтримується лише версія 1");
  const id = string(value.id, "id", 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) fail("id", "некоректний ідентифікатор");
  if (value.country !== "UA") fail("country", "підтримується лише UA");
  const verification = object(value.verification, "verification");
  let normalizedVerification: RuleVerification;
  if (verification.status === "unverified") {
    fields(verification, ["status"], "verification");
    normalizedVerification = { status: "unverified" };
  } else if (verification.status === "verified") {
    fields(verification, ["status", "checkedAt", "checkedBy", "evidenceUrl"], "verification");
    normalizedVerification = {
      status: "verified",
      checkedAt: date(verification.checkedAt, "verification.checkedAt"),
      checkedBy: string(verification.checkedBy, "verification.checkedBy", 120),
      evidenceUrl: url(verification.evidenceUrl, "verification.evidenceUrl"),
    };
  } else fail("verification.status", "невідомий статус");
  let source: RuleSource | null = null;
  if (value.source !== null) {
    const raw = object(value.source, "source");
    fields(
      raw,
      ["title", "url", "section", "editionDate", "effectiveDate", "retrievedAt"],
      "source",
    );
    source = {
      title: string(raw.title, "source.title"),
      url: url(raw.url, "source.url"),
      section: string(raw.section, "source.section", 120),
      ...(raw.editionDate === undefined
        ? {}
        : { editionDate: date(raw.editionDate, "source.editionDate") }),
      ...(raw.effectiveDate === undefined
        ? {}
        : { effectiveDate: date(raw.effectiveDate, "source.effectiveDate") }),
      ...(raw.retrievedAt === undefined
        ? {}
        : { retrievedAt: date(raw.retrievedAt, "source.retrievedAt") }),
    };
    if (!source.editionDate && !source.effectiveDate)
      fail("source", "потрібна дата редакції або набрання чинності");
  }
  if (normalizedVerification.status === "verified" && !source)
    fail("source", "перевірене правило потребує нормативного джерела й конкретного пункту");
  return {
    schemaVersion: 1,
    id,
    country: "UA",
    source,
    summary: string(value.summary, "summary"),
    verification: normalizedVerification,
  };
}

export function validateRules(inputs: readonly unknown[]): CountryRule[] {
  const ids = new Set<string>();
  return inputs.map((input, index) => {
    const rule = validateRule(input);
    if (ids.has(rule.id)) fail(`rules[${index}].id`, `повторний id «${rule.id}»`);
    ids.add(rule.id);
    return rule;
  });
}

export function parseRuleJSON(json: string): CountryRule {
  if (new TextEncoder().encode(json).length > 20_000) fail("JSON", "файл перевищує 20 КБ");
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    fail("JSON", "некоректний синтаксис");
  }
  return validateRule(input);
}

export function serializeRule(input: CountryRule): string {
  return JSON.stringify(validateRule(input), null, 2);
}
