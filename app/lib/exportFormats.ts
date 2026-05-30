export type ExportFormat = "pdf" | "docx" | "txt";

export type ExportCapability = {
  format: ExportFormat;
  label: string;
  enabled: boolean;
  plan?: "free" | "premium";
  reason?: string;
};

export type ExportEntitlement = {
  plan: "free" | "premium";
  exportFormats: Record<ExportFormat, boolean>;
};

export type ExportDownloadState = "idle" | "checking" | "ready" | "expired";

export const DEFAULT_EXPORT_FORMATS: ExportCapability[] = [
  { format: "pdf", label: "PDF", enabled: true, plan: "free" },
  { format: "docx", label: "DOCX", enabled: false, plan: "premium", reason: "Premium" },
  { format: "txt", label: "TXT", enabled: false, plan: "premium", reason: "Premium" },
];

export function isPremiumExportFormat(format?: ExportFormat | null) {
  return format === "docx" || format === "txt";
}

export function exportFormatAllowed(format: ExportFormat = "pdf", entitlement?: ExportEntitlement | null) {
  if (!isPremiumExportFormat(format)) return true;
  return Boolean(entitlement?.exportFormats[format]);
}

export function exportDownloadReadyForSelection({
  downloadFormat,
  downloadState,
  downloadUrl,
  selectedFormat,
  entitlement,
}: {
  downloadFormat: ExportFormat;
  downloadState: ExportDownloadState;
  downloadUrl?: string | null;
  selectedFormat: ExportFormat;
  entitlement?: ExportEntitlement | null;
}) {
  return Boolean(
    downloadUrl &&
      downloadState === "ready" &&
      downloadFormat === selectedFormat &&
      exportFormatAllowed(downloadFormat, entitlement),
  );
}

export function selectedExportStatusMessage({
  downloadFormat,
  downloadState,
  downloadUrl,
  selectedFormat,
  entitlement,
  downloadMessage,
  hasTailoredText,
}: {
  downloadFormat: ExportFormat;
  downloadState: ExportDownloadState;
  downloadUrl?: string | null;
  selectedFormat: ExportFormat;
  entitlement?: ExportEntitlement | null;
  downloadMessage?: string;
  hasTailoredText: boolean;
}) {
  if (!exportFormatAllowed(selectedFormat, entitlement)) {
    return hasTailoredText ? `${selectedFormat.toUpperCase()} exports unlock with Premium. PDF remains available.` : "";
  }
  if (downloadFormat === selectedFormat) return downloadMessage ?? "";
  if (!hasTailoredText) return "";
  if (!downloadUrl || downloadState !== "ready" || !exportFormatAllowed(downloadFormat, entitlement)) return "";

  return `${downloadFormat.toUpperCase()} is ready. Export ${selectedFormat.toUpperCase()} to create that format.`;
}

export function customerExportFormats(formats?: ExportCapability[], entitlement?: ExportEntitlement | null) {
  const pdfCapability = formats?.find((format) => format.format === "pdf");
  const premiumFormats: ExportFormat[] = ["docx", "txt"];

  return DEFAULT_EXPORT_FORMATS.map((format) =>
    format.format === "pdf"
      ? {
          ...format,
          enabled: pdfCapability?.enabled ?? format.enabled,
          reason: pdfCapability?.reason ?? (entitlement?.plan === "premium" ? "Included" : "Free"),
        }
      : {
          ...format,
          enabled: premiumFormats.includes(format.format) && exportFormatAllowed(format.format, entitlement),
          plan: "premium" as const,
          reason: exportFormatAllowed(format.format, entitlement) ? "Included" : "Premium",
        },
  );
}
