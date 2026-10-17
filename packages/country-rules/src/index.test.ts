import { describe, expect, it } from "vitest";
import { parseRuleJSON, serializeRule, validateRule, validateRules } from "./index";

const draft = {
  schemaVersion: 1,
  id: "ua-example",
  country: "UA",
  source: null,
  summary: "Непідтверджений технічний запис без нормативного твердження.",
  verification: { status: "unverified" },
};
const source = {
  title: "Назва перевіреного джерела",
  url: "https://example.org/rules",
  section: "Пункт 1",
  effectiveDate: "2026-01-01",
};

describe("Ukrainian rule references", () => {
  it("accepts unverified records without invented citations", () => {
    expect(validateRule(draft)).toEqual(draft);
    expect(parseRuleJSON(serializeRule(validateRule(draft)))).toEqual(draft);
  });
  it("requires source and review evidence before verified status", () => {
    const verification = {
      status: "verified",
      checkedAt: "2026-10-17",
      checkedBy: "Редактор",
      evidenceUrl: "https://example.org/evidence",
    };
    expect(() => validateRule({ ...draft, verification })).toThrow(/source/);
    expect(validateRule({ ...draft, source, verification }).verification.status).toBe("verified");
    expect(() =>
      validateRule({ ...draft, source: { ...source, url: "http://example.org" }, verification }),
    ).toThrow(/HTTPS/);
    expect(() =>
      validateRule({ ...draft, source: { ...source, effectiveDate: "2026-02-30" }, verification }),
    ).toThrow(/YYYY-MM-DD/);
  });
  it("rejects duplicate IDs, unknown fields, countries, statuses and versions", () => {
    expect(() => validateRules([draft, draft])).toThrow(/повторний/);
    expect(() => validateRule({ ...draft, citation: "invented" })).toThrow(/невідоме поле/);
    expect(() => validateRule({ ...draft, country: "ES" })).toThrow(/UA/);
    expect(() => validateRule({ ...draft, verification: { status: "claimed" } })).toThrow(/статус/);
    expect(() => validateRule({ ...draft, schemaVersion: 2 })).toThrow(/версія/);
  });
});
