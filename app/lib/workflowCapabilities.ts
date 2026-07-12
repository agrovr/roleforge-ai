import type { ExportCapability, ExportFormat } from "./exportFormats";
import { RESUME_TEMPLATES, isResumeTemplateSlug, type ResumeTemplateSlug } from "./resumeTemplates";

export type UploadFormat = "docx" | "pdf" | "txt";

export type UploadCapability = {
  format: UploadFormat;
  label: string;
  enabled: boolean;
};

export type ExportTemplateCapability = {
  template: ResumeTemplateSlug;
  label: string;
};

export type WorkflowCapabilities = {
  max_upload_bytes: number;
  upload_formats: UploadCapability[];
  export_formats: ExportCapability[];
  export_templates: ExportTemplateCapability[];
};

export const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const DEFAULT_UPLOAD_FORMATS: UploadCapability[] = [
  { format: "docx", label: "DOCX", enabled: true },
  { format: "pdf", label: "PDF", enabled: true },
  { format: "txt", label: "TXT", enabled: true },
];

const UPLOAD_FORMATS = new Set<UploadFormat>(["docx", "pdf", "txt"]);
const EXPORT_FORMATS = new Set<ExportFormat>(["pdf", "docx", "txt"]);

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeUploadCapabilities(value: unknown): UploadCapability[] {
  if (!Array.isArray(value)) return DEFAULT_UPLOAD_FORMATS;

  const seen = new Set<UploadFormat>();
  const formats = value.flatMap((item) => {
    const record = asRecord(item);
    const format = readString(record?.format).toLowerCase() as UploadFormat;
    if (!UPLOAD_FORMATS.has(format) || seen.has(format)) return [];
    seen.add(format);
    return [{
      format,
      label: readString(record?.label) || format.toUpperCase(),
      enabled: readBoolean(record?.enabled, true),
    }];
  });

  return formats.length ? formats : DEFAULT_UPLOAD_FORMATS;
}

function normalizeExportCapabilities(value: unknown): ExportCapability[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const seen = new Set<ExportFormat>();
  const formats = value.flatMap((item) => {
    const record = asRecord(item);
    const format = readString(record?.format).toLowerCase() as ExportFormat;
    if (!EXPORT_FORMATS.has(format) || seen.has(format)) return [];
    seen.add(format);

    const plan = readString(record?.plan);
    return [{
      format,
      label: readString(record?.label) || format.toUpperCase(),
      enabled: readBoolean(record?.enabled, format === "pdf"),
      plan: plan === "premium" ? "premium" as const : plan === "free" ? "free" as const : undefined,
      reason: readString(record?.reason) || undefined,
    }];
  });

  return formats.length ? formats : undefined;
}

function normalizeTemplateCapabilities(value: unknown): ExportTemplateCapability[] {
  if (!Array.isArray(value)) {
    return RESUME_TEMPLATES.map((template) => ({ template: template.slug, label: template.name }));
  }

  const seen = new Set<ResumeTemplateSlug>();
  const templates = value.flatMap((item) => {
    const record = asRecord(item);
    const template = readString(record?.template);
    if (!isResumeTemplateSlug(template) || seen.has(template)) return [];
    seen.add(template);
    return [{
      template,
      label: readString(record?.label) || RESUME_TEMPLATES.find((candidate) => candidate.slug === template)?.name || template,
    }];
  });

  return templates.length ? templates : RESUME_TEMPLATES.map((template) => ({ template: template.slug, label: template.name }));
}

export function normalizeWorkflowCapabilities(value: unknown): WorkflowCapabilities {
  const record = asRecord(value);

  return {
    max_upload_bytes: readPositiveInteger(record?.max_upload_bytes, DEFAULT_MAX_UPLOAD_BYTES),
    upload_formats: normalizeUploadCapabilities(record?.upload_formats),
    export_formats: normalizeExportCapabilities(record?.export_formats) ?? [],
    export_templates: normalizeTemplateCapabilities(record?.export_templates),
  };
}
