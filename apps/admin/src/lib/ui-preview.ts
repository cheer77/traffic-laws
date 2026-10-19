import { headers } from "next/headers";
import {
  isUiPreviewRequestAllowed,
  UI_PREVIEW_SCENARIOS,
  UI_PREVIEW_USERS,
} from "@traffic-laws/ui-preview";
import type { ImportOverview, Page, Profile, RevisionDetail, RevisionMetadata } from "./contracts";

export async function isUiPreview(): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" || process.env.UI_PREVIEW === "false") return false;
  const incoming = await headers();
  return isUiPreviewRequestAllowed({
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.UI_PREVIEW,
    host: incoming.get("host"),
  });
}

const metadata: RevisionMetadata[] = UI_PREVIEW_SCENARIOS.map((scenario, index) => ({
  id: scenario.id,
  revision: scenario.revision,
  category: scenario.category,
  question: scenario.question,
  contentStatus: scenario.contentStatus.state,
  authorId: "ui-preview-author",
  createdAt: new Date(Date.UTC(2026, 9, 18 - index, 9)).toISOString(),
}));

const page = <T>(items: T[], limit = items.length): Page<T> => ({
  items,
  page: 1,
  limit,
  nextPage: null,
});

export async function uiPreviewApiResponse(path: string, init: RequestInit): Promise<unknown> {
  const url = new URL(path, "http://ui-preview.local");
  if (url.pathname === "/users/me") return UI_PREVIEW_USERS[0] satisfies Profile;
  if (url.pathname === "/internal/scenarios") {
    const query = (url.searchParams.get("q") ?? "").toLowerCase();
    const status = url.searchParams.get("status");
    return page(
      metadata.filter(
        (item) =>
          (!query || item.id.toLowerCase().includes(query)) &&
          (!status || item.contentStatus === status),
      ),
      Number(url.searchParams.get("limit")) || metadata.length,
    );
  }
  const detailMatch = url.pathname.match(/^\/internal\/scenarios\/([^/]+)\/revisions\/(\d+)$/);
  if (detailMatch && (!init.method || init.method === "GET")) {
    const scenario = UI_PREVIEW_SCENARIOS.find(
      (item) =>
        item.id === decodeURIComponent(detailMatch[1]!) && item.revision === Number(detailMatch[2]),
    );
    if (!scenario) return null;
    const detail: RevisionDetail = {
      payload: scenario,
      authorId: "ui-preview-author",
      payloadHash: "ui-preview-payload-hash",
      rulesHash: "ui-preview-rules-hash",
      createdAt: "2026-10-18T09:00:00.000Z",
      reviews: [
        {
          id: "ui-preview-review",
          reviewerId: "ui-preview-reviewer",
          decision: "changes_requested",
          evidence: "Тестова рецензія для перевірки компонування інтерфейсу.",
          createdAt: "2026-10-18T10:00:00.000Z",
        },
      ],
      published: false,
    };
    return detail;
  }
  const historyMatch = url.pathname.match(/^\/internal\/scenarios\/([^/]+)\/revisions$/);
  if (historyMatch) {
    const id = decodeURIComponent(historyMatch[1]!);
    return page(
      metadata.filter((item) => item.id === id),
      50,
    );
  }
  if (url.pathname === "/internal/imports") {
    const overview: ImportOverview = {
      source: {
        key: "ui-preview-source",
        name: "Тестове джерело UI Preview",
        pageUrl: "https://hsc.gov.ua/",
        edition: "Демонстраційна редакція",
        sourceUpdatedAt: "2026-10-18",
        questionsUrl: "https://hsc.gov.ua/",
        answersUrl: "https://hsc.gov.ua/",
        questionsPages: 4,
        answersPages: 1,
        reuseStatus: "unclear",
        automaticPublicationAllowed: false,
        note: "Тестові показники. Імпорт, база даних і публікація не використовуються.",
      },
      runs: [
        {
          id: "ui-preview-import",
          edition: "Демонстраційна редакція",
          status: "blocked",
          reuseStatus: "unclear",
          found: 120,
          imported: 0,
          updated: 0,
          rejected: 120,
          published: 0,
          withImages: 42,
          threeDCandidates: 18,
          message: "Тестовий запуск: запис до бази вимкнено.",
          createdAt: "2026-10-18T08:00:00.000Z",
          completedAt: "2026-10-18T08:00:02.000Z",
        },
      ],
    };
    return overview;
  }
  if (init.method && init.method !== "GET") return {};
  throw new Error(`UI Preview не підтримує запит ${url.pathname}`);
}
