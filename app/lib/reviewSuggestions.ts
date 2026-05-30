export type ReviewSuggestionTone = "good" | "warn" | "neutral";
export type ReviewSuggestionKind = "change" | "suggestion";

export type ReviewSuggestionCard = {
  id: string;
  label: string;
  meta: string;
  after: string;
  tone: ReviewSuggestionTone;
  kind: ReviewSuggestionKind;
};

export type ReviewSuggestionWorkspaceInput = {
  sourceId?: string | null;
  runId?: string | null;
  generatedAt?: string | null;
  tailoredText?: string | null;
  changes?: string[] | null;
  suggestions?: string[] | null;
};

function stableSuggestionId(prefix: string, index: number, text: string) {
  let hash = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex += 1) {
    hash = (hash * 31 + text.charCodeAt(charIndex)) >>> 0;
  }
  return `${prefix}-${index + 1}-${hash.toString(36)}`;
}

export function buildReviewSuggestionCards({
  changes,
  suggestions,
  limit = 6,
}: {
  changes?: string[];
  suggestions?: string[];
  limit?: number;
}): ReviewSuggestionCard[] {
  const changeCards = (changes ?? [])
    .map((change) => change.trim())
    .filter(Boolean)
    .map((change, index): ReviewSuggestionCard => ({
      id: stableSuggestionId("change", index, change),
      label: "Change note",
      meta: `Generated change ${index + 1}`,
      after: change,
      tone: index === 0 ? "good" : "neutral",
      kind: "change",
    }));

  const suggestionCards = (suggestions ?? [])
    .map((suggestion) => suggestion.trim())
    .filter(Boolean)
    .map((suggestion, index): ReviewSuggestionCard => ({
      id: stableSuggestionId("suggestion", index, suggestion),
      label: index % 2 ? "ATS note" : "Follow-up",
      meta: `Review suggestion ${index + 1}`,
      after: suggestion,
      tone: index % 2 ? "warn" : "good",
      kind: "suggestion",
    }));

  return [...changeCards, ...suggestionCards].slice(0, limit);
}

export function reviewSuggestionWorkspaceKey(input: ReviewSuggestionWorkspaceInput) {
  const changes = (input.changes ?? []).map((value) => value.trim()).filter(Boolean).join("\n");
  const suggestions = (input.suggestions ?? []).map((value) => value.trim()).filter(Boolean).join("\n");
  const content = [
    input.sourceId?.trim() ?? "",
    input.runId?.trim() ?? "",
    input.generatedAt?.trim() ?? "",
    input.tailoredText?.trim() ?? "",
    changes,
    suggestions,
  ].join("\n---\n");
  return stableSuggestionId("review-workspace", 0, content);
}
