import { describe, expect, it } from "vitest";
import type { ScenarioListItem } from "./contracts";
import { getTicketPosition } from "./ticket-workspace";

const items: ScenarioListItem[] = [
  { id: "one", revision: 1, country: "UA", language: "uk", category: "A" },
  { id: "one", revision: 2, country: "UA", language: "uk", category: "A" },
  { id: "two", revision: 1, country: "UA", language: "uk", category: "B" },
];

describe("ticket workspace navigation", () => {
  it("uses both id and revision to find adjacent tickets", () => {
    expect(getTicketPosition(items, "one", 2)).toEqual({
      index: 1,
      previous: items[0],
      next: items[2],
      progressPercent: 67,
    });
  });

  it("does not offer unrelated navigation when the active revision is absent", () => {
    expect(getTicketPosition(items, "missing", 1)).toEqual({
      index: -1,
      previous: undefined,
      next: undefined,
      progressPercent: 0,
    });
  });
});
