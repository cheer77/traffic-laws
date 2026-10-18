import type { Scenario } from "@traffic-laws/scenarios";

export type StaffRole = "admin" | "reviewer";
export interface Profile {
  id: string;
  email: string;
  role: "student" | StaffRole;
  status: "active" | "disabled";
  createdAt: string;
}
export interface RevisionMetadata {
  id: string;
  revision: number;
  category: string;
  question: string;
  contentStatus: Scenario["contentStatus"]["state"];
  authorId: string;
  createdAt: string;
}
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  nextPage: number | null;
}
export interface Review {
  id: string;
  reviewerId: string;
  decision: "recommend_approval" | "changes_requested" | "rejected";
  evidence: string;
  createdAt: string;
}
export interface RevisionDetail {
  payload: Scenario;
  authorId: string;
  payloadHash: string;
  rulesHash: string;
  createdAt: string;
  reviews: Review[];
}
