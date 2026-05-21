export type ParsedResumeSection = { title: string; lines: string[] };
export type ParsedResume = { name: string; role: string; contact: string; sections: ParsedResumeSection[] };
export type ParsedResumeEntry = { title: string; meta?: string; date?: string; details: string[]; bullets: string[] };
export type PlainResumeLine = { text: string; kind: "heading" | "bullet" | "body" };

const RESUME_SECTION_TITLES: Record<string, string> = {
  "professional summary": "Professional summary",
  summary: "Professional summary",
  profile: "Professional summary",
  objective: "Professional summary",
  "career summary": "Professional summary",
  experience: "Experience",
  "work experience": "Experience",
  "professional experience": "Experience",
  "relevant experience": "Experience",
  "employment history": "Experience",
  "work history": "Experience",
  "selected experience": "Experience",
  skills: "Skills",
  "technical skills": "Skills",
  "core skills": "Skills",
  "key skills": "Skills",
  competencies: "Skills",
  "tools and technologies": "Skills",
  projects: "Projects",
  "selected projects": "Projects",
  education: "Education",
  certifications: "Certifications",
  awards: "Awards",
  achievements: "Achievements",
};

export function normalizeResumeLine(line: string) {
  return line
    .replace(/\r/g, "")
    .replace(/^```[a-z]*$/i, "")
    .replace(/^#{1,4}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[•●]\s*/, "- ")
    .trim();
}

function normalizeHeadingKey(line: string) {
  return normalizeResumeLine(line)
    .replace(/^[\s:.-]+/, "")
    .replace(/[\s:.-]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSectionMarker(line: string): { title: string; rest?: string } | null {
  const cleaned = normalizeResumeLine(line);
  const exactTitle = RESUME_SECTION_TITLES[normalizeHeadingKey(cleaned)];
  if (exactTitle) return { title: exactTitle };

  const inlineMatch = cleaned.match(/^([A-Za-z][A-Za-z /&+-]{2,42})(?:\:|\s[-–—]\s)(.+)$/);
  if (!inlineMatch) return null;

  const inlineTitle = RESUME_SECTION_TITLES[normalizeHeadingKey(inlineMatch[1])];
  if (!inlineTitle) return null;

  return { title: inlineTitle, rest: inlineMatch[2].trim() };
}

function looksLikeContactLine(line: string) {
  const digitCount = line.replace(/\D/g, "").length;
  const hasPhoneLikeNumber = digitCount >= 7 && /\+?\d[\d\s().-]{6,}/.test(line);

  return hasPhoneLikeNumber || /@|linkedin|github|portfolio|https?:\/\/|www\.|[A-Z][a-z]+,\s*[A-Z]{2}/i.test(line);
}

function splitHeaderParts(line: string) {
  return normalizeResumeLine(line)
    .split(/\s+\|\s+|\s+•\s+|\s+·\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isDocumentLabel(line: string) {
  return ["tailored resume", "resume", "generated resume", "role-targeted draft"].includes(normalizeHeadingKey(line));
}

export function parseResumeText(text?: string): ParsedResume | null {
  const lines = (text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeResumeLine)
    .filter((line) => line && !line.startsWith("```") && !isDocumentLabel(line));

  if (!lines.length) return null;

  const firstHeadingIndex = lines.findIndex((line) => Boolean(getSectionMarker(line)));
  const headerLines = firstHeadingIndex >= 0 ? lines.slice(0, firstHeadingIndex) : lines.slice(0, Math.min(4, lines.length));
  const headerParts = headerLines.flatMap(splitHeaderParts);
  let name = "Tailored Resume";
  let role = "Role-targeted draft";
  const contactParts: string[] = [];

  for (const part of headerParts) {
    if (name === "Tailored Resume" && !looksLikeContactLine(part)) {
      name = part;
    } else if (role === "Role-targeted draft" && !looksLikeContactLine(part)) {
      role = part;
    } else {
      contactParts.push(part);
    }
  }

  if (name === "Tailored Resume" && lines[0] && !getSectionMarker(lines[0])) {
    const [firstPart, secondPart, ...restParts] = splitHeaderParts(lines[0]);
    name = firstPart || name;
    if (secondPart && !looksLikeContactLine(secondPart)) role = secondPart;
    contactParts.push(...restParts);
  }

  const contentLines = firstHeadingIndex >= 0 ? lines.slice(firstHeadingIndex) : lines.slice(headerLines.length);
  const sections: ParsedResumeSection[] = [];

  for (const line of contentLines) {
    const marker = getSectionMarker(line);
    if (marker) {
      sections.push({ title: marker.title, lines: marker.rest ? [marker.rest] : [] });
    } else if (sections.length) {
      sections[sections.length - 1].lines.push(line);
    } else {
      sections.push({ title: "Professional summary", lines: [line] });
    }
  }

  if (name === "Tailored Resume" && sections[0]?.title === "Professional summary") {
    const summaryHeaderParts = splitHeaderParts(sections[0].lines[0] ?? "");
    if (summaryHeaderParts.length >= 2 && !looksLikeContactLine(summaryHeaderParts[0])) {
      name = summaryHeaderParts[0];
      const rolePart = summaryHeaderParts.find((part, index) => index > 0 && !looksLikeContactLine(part));
      if (rolePart) role = rolePart;
      contactParts.push(...summaryHeaderParts.filter((part) => part !== name && part !== rolePart));
      sections[0].lines = sections[0].lines.slice(1);

      while (sections[0]?.lines[0] && looksLikeContactLine(sections[0].lines[0])) {
        contactParts.push(sections[0].lines[0]);
        sections[0].lines = sections[0].lines.slice(1);
      }
    }
  }

  return {
    name,
    role,
    contact: Array.from(new Set(contactParts)).join(" · "),
    sections: sections.filter((section) => section.lines.length),
  };
}

export function isBulletLine(line: string) {
  return /^[-•*]\s+/.test(line);
}

export function cleanBulletLine(line: string) {
  return line.replace(/^[-•*]\s+/, "");
}

function looksLikeDateRange(line: string) {
  return /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|present|current|\d{4})\b/i.test(line);
}

function splitResumeDetailParts(line: string) {
  return normalizeResumeLine(line)
    .split(/\s+\|\s+|\s+•\s+|\s+·\s+|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isStructuredResumeSection(title: string) {
  return /experience|project|education|certification|award|achievement/i.test(title);
}

function looksLikeResumeEntryStart(line: string, nextLine?: string) {
  if (!line || isBulletLine(line) || looksLikeContactLine(line) || getSectionMarker(line)) return false;
  if (line.length > 120) return false;
  if (looksLikeDateRange(line) && line.length < 24) return false;

  const roleWords =
    /engineer|developer|manager|lead|analyst|designer|director|consultant|specialist|coordinator|architect|product|project|program|operations|marketing|sales|founder|intern|assistant|associate|researcher|student|certified|certificate|degree|bachelor|master/i;
  const organizationWords = /remote|hybrid|onsite|company|inc\.?|llc|corp|university|college|school|bootcamp|ltd\.?/i;

  return (
    roleWords.test(line) ||
    splitResumeDetailParts(line).some(looksLikeDateRange) ||
    Boolean(nextLine && !isBulletLine(nextLine) && nextLine.length < 90 && (looksLikeDateRange(nextLine) || organizationWords.test(nextLine)))
  );
}

function parseResumeEntryHeader(line: string) {
  const parts = splitResumeDetailParts(line);
  const dateParts = parts.filter(looksLikeDateRange);
  const contentParts = parts.filter((part) => !looksLikeDateRange(part));
  const title = contentParts[0] || line;
  const meta = contentParts.slice(1).join(" · ") || undefined;
  const date = dateParts.join(" · ") || undefined;

  return { title, meta, date };
}

export function buildResumeEntries(lines: string[]) {
  const entries: ParsedResumeEntry[] = [];
  let current: ParsedResumeEntry | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.title || current.details.length || current.bullets.length) entries.push(current);
    current = null;
  };

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1];

    if (isBulletLine(line)) {
      if (!current) current = { title: "Selected work", details: [], bullets: [] };
      current.bullets.push(cleanBulletLine(line));
      return;
    }

    if (looksLikeDateRange(line) && line.length < 36 && current && !current.date) {
      current.date = line;
      return;
    }

    if (looksLikeResumeEntryStart(line, nextLine)) {
      pushCurrent();
      current = { ...parseResumeEntryHeader(line), details: [], bullets: [] };
      return;
    }

    if (current) {
      if (!current.meta && current.bullets.length === 0 && line.length < 90) {
        current.meta = line;
      } else {
        current.details.push(line);
      }
      return;
    }

    current = { title: "Overview", details: [line], bullets: [] };
  });

  pushCurrent();
  return entries;
}

export function buildPlainResumeLines(text?: string): PlainResumeLine[] {
  return (text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeResumeLine)
    .filter(Boolean)
    .slice(0, 90)
    .flatMap((line): PlainResumeLine[] => {
      const marker = getSectionMarker(line);
      if (marker || (/^[A-Z][A-Z\s/&+-]{3,34}$/.test(line) && line.length <= 36)) {
        const heading: PlainResumeLine = { text: marker?.title ?? line, kind: "heading" };
        return marker?.rest ? [heading, { text: marker.rest, kind: "body" }] : [heading];
      }
      if (isBulletLine(line)) return [{ text: cleanBulletLine(line), kind: "bullet" }];
      return [{ text: line, kind: "body" }];
    })
    .slice(0, 90);
}
