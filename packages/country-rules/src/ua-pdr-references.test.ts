import { describe, expect, it } from "vitest";
import { UA_PDR_REFERENCES } from "./ua-pdr-references";
import { validateRules } from "./index";

describe("official-text research records", () => {
  it("keeps exact source metadata and all content unverified", () => {
    expect(validateRules(UA_PDR_REFERENCES)).toEqual(UA_PDR_REFERENCES);
    expect(UA_PDR_REFERENCES).toHaveLength(8);
    expect(new Set(UA_PDR_REFERENCES.map((rule) => rule.source?.section)).size).toBe(8);
    for (const rule of UA_PDR_REFERENCES) {
      expect(rule.source?.url).toBe("https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF");
      expect(rule.source?.editionDate).toBe("2026-04-09");
      expect(rule.source?.retrievedAt).toBe("2026-10-17");
      expect(rule.verification.status).toBe("unverified");
    }
  });
});
