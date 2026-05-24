export type TargetUrlInfo = {
  host: string;
  label: string;
};

export function isUrlTarget(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
}

const READABLE_SEGMENT_OVERRIDES: Record<string, string> = {
  ai: "AI",
  api: "API",
  ats: "ATS",
  hr: "HR",
  it: "IT",
  ml: "ML",
  openai: "OpenAI",
  qa: "QA",
  roleforge: "RoleForge",
  ui: "UI",
  ux: "UX",
};

function readableUrlPart(value: string) {
  const lower = value.toLowerCase();
  if (READABLE_SEGMENT_OVERRIDES[lower]) return READABLE_SEGMENT_OVERRIDES[lower];
  return value.length <= 3 ? value.toUpperCase() : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function readableUrlSegment(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map(readableUrlPart)
    .join(" ");
}

export function readableDomainName(hostname: string) {
  const clean = hostname.replace(/^www\./i, "");
  const firstSegment = clean.split(".").find(Boolean) || clean;
  return readableUrlSegment(firstSegment);
}

function companyNameFromJobBoardUrl(url: URL, host: string) {
  const pathSegments = url.pathname.split("/").map((segment) => segment.trim()).filter(Boolean);
  const firstPathSegment = pathSegments[0] ?? "";
  const genericPathSegments = /^(apply|careers?|jobs?|job|positions?|openings?|en|us)$/i;

  if (/greenhouse\.io$/i.test(host) && firstPathSegment && !/^jobs?$/i.test(firstPathSegment)) {
    return readableUrlSegment(firstPathSegment);
  }

  if (/lever\.co$/i.test(host) && firstPathSegment) {
    return readableUrlSegment(firstPathSegment);
  }

  if (/ashbyhq\.com$/i.test(host) && firstPathSegment) {
    return readableUrlSegment(firstPathSegment);
  }

  if (/(smartrecruiters\.com|workable\.com)$/i.test(host) && firstPathSegment && !genericPathSegments.test(firstPathSegment)) {
    return readableUrlSegment(firstPathSegment);
  }

  const workdayMatch = host.match(/^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/i);
  if (workdayMatch?.[1]) return readableUrlSegment(workdayMatch[1]);

  return "";
}

export function parseTargetUrl(value: string): TargetUrlInfo | null {
  const trimmed = value.trim();
  if (!trimmed || !isUrlTarget(trimmed)) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "");
    const labelName = companyNameFromJobBoardUrl(url, host) || readableDomainName(host);

    return {
      host,
      label: `${labelName} job target`,
    };
  } catch {
    return {
      host: "Job URL",
      label: "Job URL target",
    };
  }
}
