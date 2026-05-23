export type SavedRunLinkTarget = {
  id: string;
  accountRunId?: string;
};

export function savedRunHistoryHref(run: SavedRunLinkTarget, options: { restore?: boolean } = {}) {
  const params = new URLSearchParams({ historyRun: run.accountRunId ?? run.id });
  if (options.restore) params.set("historyAction", "restore");
  return `/app?${params.toString()}#history`;
}
