import { validateRule } from "@traffic-laws/country-rules";
import { validateScenario } from "@traffic-laws/scenarios";
// Synthetic persistence fixtures; deliberately not imported by application/seed/build entrypoints.
export const TEST_RULE = validateRule({
  schemaVersion: 1,
  id: "fixture-rule",
  country: "UA",
  source: {
    title: "SYNTHETIC TEST ONLY",
    url: "https://example.org/test",
    section: "fixture",
    editionDate: "2026-01-01",
  },
  summary: "Synthetic test contract, not traffic law.",
  verification: {
    status: "verified",
    checkedAt: "2026-10-17",
    checkedBy: "Synthetic fixture",
    evidenceUrl: "https://example.org/test",
  },
});
export function fixtureScenario(revision = 1) {
  return validateScenario(
    {
      schemaVersion: 1,
      id: "fixture-question",
      revision,
      country: "UA",
      language: "uk",
      category: "SYNTHETIC TEST ONLY",
      question: "Оберіть тестову відповідь.",
      answers: [
        { id: "yes", text: "Тест A" },
        { id: "no", text: "Тест Б" },
      ],
      correctAnswerId: revision === 1 ? "yes" : "no",
      explanation: "Synthetic persistence fixture, not educational material.",
      ruleReferences: [TEST_RULE.id],
      sceneReference: null,
      contentStatus: { state: "in_review" },
    },
    { rules: [TEST_RULE] },
  );
}
