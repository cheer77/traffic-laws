import type { ScenarioListItem } from "./contracts";

export function getTicketPosition(items: ScenarioListItem[], id: string, revision: number) {
  const index = items.findIndex((item) => item.id === id && item.revision === revision);
  return {
    index,
    previous: index > 0 ? items[index - 1] : undefined,
    next: index >= 0 ? items[index + 1] : undefined,
    progressPercent:
      index >= 0 && items.length ? Math.round(((index + 1) / items.length) * 100) : 0,
  };
}
