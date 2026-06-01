export type ApplicationStatus = "active" | "draft" | "generated" | "tailored" | "exported" | "archived";

export type ApplicationStatusTone = "restore" | "download" | "legacy" | "open" | "local";

export const APPLICATION_STATUS_OPTIONS: Array<{
  status: ApplicationStatus;
  label: string;
  detail: string;
  tone: ApplicationStatusTone;
}> = [
  {
    status: "tailored",
    label: "Tailored",
    detail: "Resume and kit are being prepared for this opportunity.",
    tone: "restore",
  },
  {
    status: "exported",
    label: "Ready",
    detail: "Export is ready to use for the application.",
    tone: "download",
  },
  {
    status: "active",
    label: "Follow-up",
    detail: "Application is active and should stay on your radar.",
    tone: "open",
  },
  {
    status: "archived",
    label: "Archived",
    detail: "Opportunity is no longer active.",
    tone: "legacy",
  },
];

const APPLICATION_STATUS_VALUES = new Set<ApplicationStatus>([
  "active",
  "draft",
  "generated",
  "tailored",
  "exported",
  "archived",
]);

const APPLICATION_STATUS_COPY = new Map(APPLICATION_STATUS_OPTIONS.map((option) => [option.status, option]));

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && APPLICATION_STATUS_VALUES.has(value as ApplicationStatus);
}

export function normalizeApplicationStatus(value: unknown): ApplicationStatus {
  return isApplicationStatus(value) ? value : "exported";
}

export function applicationStatusCopy(value: unknown) {
  const status = normalizeApplicationStatus(value);
  if (APPLICATION_STATUS_COPY.has(status)) return APPLICATION_STATUS_COPY.get(status)!;

  if (status === "draft") {
    return {
      status,
      label: "Draft",
      detail: "Project was started but has not been tailored yet.",
      tone: "local" as const,
    };
  }

  return {
    status,
    label: "Generated",
    detail: "A generated draft exists for this opportunity.",
    tone: "restore" as const,
  };
}
