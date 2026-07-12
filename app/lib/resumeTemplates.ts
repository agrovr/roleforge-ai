export type ResumeTemplateVariant = "essential" | "professional" | "editorial" | "compact" | "executive" | "technical" | "student" | "hybrid" | "academic" | "impact";

export type ResumeTemplate = {
  slug: string;
  name: string;
  tag: string;
  variant: ResumeTemplateVariant;
  detail: string;
  previewName: string;
  previewRole: string;
  featured?: boolean;
  recommended?: boolean;
};

export const RESUME_TEMPLATE_STORAGE_KEY = "roleforge-template-v1";
export const RESUME_TEMPLATE_COOKIE = "roleforge-template";

export const RESUME_TEMPLATES = [
  {
    slug: "classic",
    name: "Essential",
    tag: "Most roles",
    variant: "essential",
    detail: "A clean single-column format for dependable everyday applications.",
    previewName: "Avery Stone",
    previewRole: "Product Operations Manager",
    featured: true,
    recommended: true,
  },
  {
    slug: "modern",
    name: "Professional",
    tag: "Corporate roles",
    variant: "professional",
    detail: "A centered, polished format for business, operations, and client-facing work.",
    previewName: "Camille Hart",
    previewRole: "Operations Director",
    featured: true,
    recommended: false,
  },
  {
    slug: "editorial",
    name: "Studio",
    tag: "Creative fields",
    variant: "editorial",
    detail: "A restrained serif format for design, writing, brand, and portfolio-led work.",
    previewName: "Mina Okafor",
    previewRole: "Brand Strategist",
    featured: false,
    recommended: false,
  },
  {
    slug: "compact",
    name: "Compact",
    tag: "One-page resumes",
    variant: "compact",
    detail: "A dense but readable format for fitting substantial experience on one page.",
    previewName: "Iris Calder",
    previewRole: "Product Manager",
    featured: false,
    recommended: false,
  },
  {
    slug: "executive",
    name: "Leadership",
    tag: "Senior leadership",
    variant: "executive",
    detail: "A spacious serif format that gives leadership scope and selected impact room.",
    previewName: "Rafael Ko",
    previewRole: "VP, Product Operations",
    featured: false,
    recommended: false,
  },
  {
    slug: "engineer",
    name: "Technical",
    tag: "Engineering & data",
    variant: "technical",
    detail: "A compact skills-and-projects format for engineering, data, and technical roles.",
    previewName: "Elena Voss",
    previewRole: "Software Engineer",
    featured: true,
    recommended: false,
  },
  {
    slug: "student",
    name: "Early Career",
    tag: "Students & internships",
    variant: "student",
    detail: "An education-and-projects-led format for internships, graduates, and first roles.",
    previewName: "Jordan Ellis",
    previewRole: "Business Analytics Student",
    featured: true,
    recommended: false,
  },
  {
    slug: "hybrid",
    name: "Career Pivot",
    tag: "Career changes",
    variant: "hybrid",
    detail: "A combination format that brings transferable strengths forward without hiding work history.",
    previewName: "Samira Quinn",
    previewRole: "Program Manager",
    featured: false,
    recommended: false,
  },
  {
    slug: "academic",
    name: "Academic",
    tag: "Research & education",
    variant: "academic",
    detail: "A traditional format for research, teaching, publications, and advanced education.",
    previewName: "Adrian Cole",
    previewRole: "Research Fellow",
    featured: false,
    recommended: false,
  },
  {
    slug: "impact",
    name: "Impact",
    tag: "Sales & marketing",
    variant: "impact",
    detail: "A bold but readable format for measurable growth, campaigns, revenue, and client outcomes.",
    previewName: "Tessa Monroe",
    previewRole: "Growth Marketing Lead",
    featured: false,
    recommended: false,
  },
] as const satisfies readonly ResumeTemplate[];

export type ResumeTemplateSlug = (typeof RESUME_TEMPLATES)[number]["slug"];

export function isResumeTemplateSlug(value?: string | null): value is ResumeTemplateSlug {
  return RESUME_TEMPLATES.some((template) => template.slug === value);
}

export type ResumeTemplatePreferenceOptions = {
  requested?: string | null;
  cookie?: string | null;
  stored?: string | null;
};

export function resolveResumeTemplatePreference(options: ResumeTemplatePreferenceOptions) {
  for (const value of [options.requested, options.cookie, options.stored]) {
    if (isResumeTemplateSlug(value)) return value;
  }
  return RESUME_TEMPLATES[0].slug;
}

export function readResumeTemplateCookie(cookieHeader?: string | null) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 1) continue;
    const name = part.slice(0, separatorIndex).trim();
    if (name !== RESUME_TEMPLATE_COOKIE) continue;

    try {
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      return isResumeTemplateSlug(value) ? value : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function resumeTemplateCookieAssignment(slug: ResumeTemplateSlug) {
  return `${RESUME_TEMPLATE_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function getResumeTemplate(value?: string | null) {
  return RESUME_TEMPLATES.find((template) => template.slug === value) ?? RESUME_TEMPLATES[0];
}

export function resumeTemplateStudioHref(value?: string | null) {
  const template = getResumeTemplate(value);
  return `/app?template=${encodeURIComponent(template.slug)}`;
}

export function resumeTemplateEntryHref(value: string | null | undefined, signedIn: boolean) {
  const studioHref = resumeTemplateStudioHref(value);
  return signedIn ? studioHref : `/login?next=${encodeURIComponent(studioHref)}`;
}
