import type { ExportFormat } from "./exportFormats";
import { getResumeTemplate, type ResumeTemplateSlug } from "./resumeTemplates";

export type WorkflowExportPayload = {
  filename: string;
  title: string;
  content: string;
  format: ExportFormat;
  template: ResumeTemplateSlug;
};

export function buildWorkflowExportPayload(
  content: string,
  format: ExportFormat = "pdf",
  templateSlug?: string | null,
): WorkflowExportPayload {
  const template = getResumeTemplate(templateSlug);

  return {
    filename: `tailored_resume_${template.slug}.${format}`,
    title: "TAILORED RESUME",
    content,
    format,
    template: template.slug,
  };
}
