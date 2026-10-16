import type { SavedHistoryItem } from "./supabase/savedProjects";

export const PROJECT_FILTERS = ["All", "Active", "Tailored", "Ready", "Archived"] as const;
export type ProjectFilter = typeof PROJECT_FILTERS[number];

export function latestProjects(runs: SavedHistoryItem[]) {
  const projects = new Map<string, SavedHistoryItem>();
  for (const run of [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = run.projectId || run.accountRunId || run.id;
    if (!projects.has(key)) projects.set(key, run);
  }
  return [...projects.values()];
}

export function matchesProjectFilter(run: SavedHistoryItem, filter: ProjectFilter) {
  if (filter === "All") return true;
  if (filter === "Active") return run.applicationStatus !== "archived";
  return run.applicationStatus === ({ Tailored: "tailored", Ready: "exported", Archived: "archived" } as const)[filter];
}

export function projectResumeText(run: SavedHistoryItem) {
  const result = run.snapshot?.result;
  const text = result && typeof result === "object" ? (result as Record<string, unknown>).tailored_text : undefined;
  return typeof text === "string" ? text.trim() : "";
}

export function projectDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Date unavailable";
}
