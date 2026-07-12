import { DEFAULT_MAX_UPLOAD_BYTES, type UploadFormat } from "./workflowCapabilities";

type ResumeFile = Pick<File, "name" | "size">;

type ResumeUploadOptions = {
  maxBytes?: number;
  allowedFormats?: UploadFormat[];
};

export type ResumeUploadValidation =
  | { valid: true }
  | { valid: false; code: "unsupported_file_type" | "upload_too_large"; message: string };

function safeMaxBytes(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : DEFAULT_MAX_UPLOAD_BYTES;
}

function fileExtension(filename: string) {
  const match = filename.trim().toLowerCase().match(/\.([^.]+)$/);
  return match?.[1] ?? "";
}

function formatAllowedFormats(formats: UploadFormat[]) {
  const labels = formats.map((format) => format.toUpperCase());
  if (labels.length <= 1) return labels[0] ?? "DOCX, PDF, or TXT";
  if (labels.length === 2) return `${labels[0]} or ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
}

export function formatUploadSize(bytes: number) {
  const safeBytes = Math.max(0, bytes);
  if (safeBytes < 1024) {
    return `${safeBytes} ${safeBytes === 1 ? "byte" : "bytes"}`;
  }

  const megabytes = safeBytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${megabytes >= 10 || Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
  }

  return `${Math.ceil(safeBytes / 1024)} KB`;
}

export function validateResumeUpload(
  file: ResumeFile,
  options: ResumeUploadOptions = {},
): ResumeUploadValidation {
  const allowedFormats: UploadFormat[] = options.allowedFormats?.length ? options.allowedFormats : ["docx", "pdf", "txt"];
  const extension = fileExtension(file.name) as UploadFormat;

  if (!allowedFormats.includes(extension)) {
    return {
      valid: false,
      code: "unsupported_file_type",
      message: `Choose a resume file in ${formatAllowedFormats(allowedFormats)} format.`,
    };
  }

  const maxBytes = safeMaxBytes(options.maxBytes);
  if (file.size > maxBytes) {
    return {
      valid: false,
      code: "upload_too_large",
      message: `${file.name} is ${formatUploadSize(file.size)}. Choose a resume no larger than ${formatUploadSize(maxBytes)}.`,
    };
  }

  return { valid: true };
}
