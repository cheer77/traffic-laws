import type { SceneDefinition } from "@traffic-laws/scene-engine";
export interface Profile {
  id: string;
  email: string;
  role: "student" | "reviewer" | "admin";
  status: "active" | "disabled";
  createdAt: string;
}
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  nextPage: number | null;
}
export interface ScenarioListItem {
  id: string;
  revision: number;
  country: "UA";
  language: "uk";
  category: string;
  question?: string;
  presentation?: "text" | "3d";
}
export interface Question {
  id: string;
  revision: number;
  country: "UA";
  language: "uk";
  category: string;
  question: string;
  answers: { id: string; text: string }[];
  sceneReference: null | { kind: "snapshot"; scene: SceneDefinition };
}
export interface ProgressSummary {
  attempts: number;
  correct: number;
  completedRevisions: number;
}
export interface Attempt {
  id: string;
  scenarioId: string;
  revision: number;
  answerId: string;
  correct: boolean;
  completedAt: string;
}
export interface AttemptFeedback extends Attempt {
  correctAnswerId: string;
  explanation: string;
  ruleReferences: string[];
}
