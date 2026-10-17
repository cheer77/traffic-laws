import { describe, expect, it } from "vitest";
import { createScene } from "@traffic-laws/scene-engine";
import { validateRule } from "@traffic-laws/country-rules";
import { DEMO_SCENARIOS } from "./demo";
import {
  parseScenarioJSON,
  publishScenario,
  serializeScenario,
  validateScenario,
  validateScenarios,
} from "./index";

const draft = DEMO_SCENARIOS[0];
const unverified = validateRule({
  schemaVersion: 1,
  id: "ua-reference",
  country: "UA",
  source: null,
  summary: "Запис очікує перевірки.",
  verification: { status: "unverified" },
});
const verified = validateRule({
  ...unverified,
  source: {
    title: "Джерело",
    url: "https://example.org/rules",
    section: "Пункт 1",
    effectiveDate: "2026-01-01",
  },
  verification: {
    status: "verified",
    checkedAt: "2026-10-17",
    checkedBy: "Редактор",
    evidenceUrl: "https://example.org/evidence",
  },
});

describe("scenario boundary and editorial lifecycle", () => {
  it("round-trips a scene snapshot without following edits to the original", () => {
    const source = createScene();
    const scenario = validateScenario(
      { ...draft, sceneReference: { kind: "snapshot", scene: source } },
      { rules: [] },
    );
    source.objects[0].transform.position[0] = 40;
    expect(scenario.sceneReference?.scene.objects[0].transform.position[0]).toBe(0);
    expect(parseScenarioJSON(serializeScenario(scenario, { rules: [] }), { rules: [] })).toEqual(
      scenario,
    );
  });
  it("reuses one preset in two distinct valid drafts", () => {
    expect(DEMO_SCENARIOS).toHaveLength(2);
    expect(DEMO_SCENARIOS[0].sceneReference?.scene.id).toBe(
      DEMO_SCENARIOS[1].sceneReference?.scene.id,
    );
    expect(
      DEMO_SCENARIOS[0].sceneReference?.scene.objects.find((item) => item.instanceId === "light-s")
        ?.properties.signal,
    ).toBe("green");
    expect(
      DEMO_SCENARIOS[1].sceneReference?.scene.objects.find((item) => item.instanceId === "light-s")
        ?.properties.signal,
    ).toBe("red");
  });
  it("supports text tickets and validates answer/ID integrity", () => {
    expect(
      validateScenario({ ...draft, sceneReference: null }, { rules: [] }).sceneReference,
    ).toBeNull();
    expect(() => validateScenario({ ...draft, correctAnswerId: "missing" }, { rules: [] })).toThrow(
      /correctAnswerId/,
    );
    expect(() =>
      validateScenario({ ...draft, answers: [draft.answers[0], draft.answers[0]] }, { rules: [] }),
    ).toThrow(/повторний/);
    expect(() => validateScenarios([draft, draft], { rules: [] })).toThrow(/повторний/);
  });
  it("rejects malformed scenes, unknown references, fields and versions", () => {
    expect(() =>
      validateScenario(
        {
          ...draft,
          sceneReference: { kind: "snapshot", scene: { ...createScene(), objects: [], bad: true } },
        },
        { rules: [] },
      ),
    ).toThrow(/sceneReference.scene/);
    expect(() =>
      validateScenario({ ...draft, ruleReferences: ["missing"] }, { rules: [] }),
    ).toThrow(/невідоме правило/);
    expect(() => validateScenario({ ...draft, extra: true }, { rules: [] })).toThrow(
      /невідоме поле/,
    );
    expect(() => validateScenario({ ...draft, schemaVersion: 2 }, { rules: [] })).toThrow(/версія/);
    expect(() => parseScenarioJSON("{", { rules: [] })).toThrow(/синтаксис/);
  });
  it("refuses publication before content and every rule reference are verified", () => {
    expect(() => publishScenario(draft, { rules: [] })).toThrow(/після перевірки/);
    const reviewed = {
      ...draft,
      ruleReferences: ["ua-reference"],
      contentStatus: { state: "verified", reviewedAt: "2026-10-17", reviewedBy: "Редактор" },
    };
    expect(() => validateScenario(reviewed, { rules: [unverified] })).toThrow(/не перевірене/);
    const validated = validateScenario(reviewed, { rules: [verified] });
    expect(publishScenario(validated, { rules: [verified] }).contentStatus.state).toBe("published");
    expect(() =>
      validateScenario({ ...reviewed, ruleReferences: [] }, { rules: [verified] }),
    ).toThrow(/нормативного/);
  });
});
