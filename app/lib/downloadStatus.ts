import type { ExportFormat } from "./exportFormats";

export type CheckedDownloadState = "ready" | "expired";

export function downloadStatusFromHead(format: ExportFormat, status: number) {
  const label = format.toUpperCase();

  if (status >= 200 && status < 300) {
    return {
      state: "ready" as CheckedDownloadState,
      message: `${label} download is ready`,
    };
  }

  if (status === 402) {
    return {
      state: "expired" as CheckedDownloadState,
      message: `${label} download requires an active Premium plan. Switch to PDF or reopen Premium to use this file.`,
    };
  }

  return {
    state: "expired" as CheckedDownloadState,
    message: `This ${label} link expired. Run the export again to create a fresh file.`,
  };
}
