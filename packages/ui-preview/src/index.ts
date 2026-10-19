import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";

export const UI_PREVIEW_LABEL = "Тестові дані · UI Preview";

export interface UiPreviewRequestContext {
  nodeEnv: string | undefined;
  enabled: string | undefined;
  host: string | null | undefined;
}

export function isUiPreviewRequestAllowed(context: UiPreviewRequestContext): boolean {
  if (context.nodeEnv !== "development" || context.enabled === "false" || !context.host)
    return false;
  try {
    const hostname = new URL(`http://${context.host}`).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export const UI_PREVIEW_SCENARIOS = EDUCATIONAL_DEMO_SCENARIOS.slice(0, 3);

export const UI_PREVIEW_USERS = [
  {
    id: "ui-preview-admin",
    email: "admin.preview@localhost",
    role: "admin" as const,
    status: "active" as const,
    createdAt: "2026-10-01T09:00:00.000Z",
    label: UI_PREVIEW_LABEL,
  },
  {
    id: "ui-preview-student",
    email: "student.preview@localhost",
    role: "student" as const,
    status: "active" as const,
    createdAt: "2026-10-02T09:00:00.000Z",
    label: UI_PREVIEW_LABEL,
  },
] as const;

export const UI_PREVIEW_PROGRESS = {
  attempts: 12,
  correct: 9,
  completedRevisions: 3,
  label: UI_PREVIEW_LABEL,
} as const;

export const UI_PREVIEW_ATTEMPTS = [
  {
    id: "preview-attempt-1",
    scenarioId: UI_PREVIEW_SCENARIOS[0]!.id,
    revision: 1,
    answerId: "stop",
    correct: true,
    completedAt: "2026-10-18T08:45:00.000Z",
  },
  {
    id: "preview-attempt-2",
    scenarioId: UI_PREVIEW_SCENARIOS[1]!.id,
    revision: 1,
    answerId: "first",
    correct: false,
    completedAt: "2026-10-17T16:20:00.000Z",
  },
] as const;

export const UI_PREVIEW_EXAMS = [
  {
    id: "preview-exam-a",
    title: "Тренувальний іспит A",
    status: "available" as const,
    questionCount: 20,
    bestScore: 17,
    label: UI_PREVIEW_LABEL,
  },
  {
    id: "preview-exam-b",
    title: "Тренувальний іспит B",
    status: "draft" as const,
    questionCount: 20,
    bestScore: null,
    label: UI_PREVIEW_LABEL,
  },
] as const;

export const UI_PREVIEW_ANALYTICS = {
  activeStudents: 128,
  attemptsThisWeek: 746,
  averageAccuracy: 78,
  completionRate: 64,
  label: UI_PREVIEW_LABEL,
} as const;
