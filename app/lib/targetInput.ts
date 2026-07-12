import { DEFAULT_MAX_JOB_DESCRIPTION_CHARS } from "./workflowCapabilities";

export type TargetInputMode = "text" | "url";

export type TargetInputState = {
  activeValue: string;
  characterCount: number;
  countLabel: string;
  descriptionTooLong: boolean;
  disabledReason: string;
  hasTarget: boolean;
  invalid: boolean;
  jobUrlInvalid: boolean;
  nearDescriptionLimit: boolean;
};

type TargetInputOptions = {
  mode: TargetInputMode;
  jdText: string;
  jdUrl: string;
  normalizedJobUrl: string | null;
  maxJobDescriptionChars?: number;
};

function safeMaxCharacters(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : DEFAULT_MAX_JOB_DESCRIPTION_CHARS;
}

function count(value: number) {
  return value.toLocaleString("en-US");
}

export function deriveTargetInputState(options: TargetInputOptions): TargetInputState {
  const maxCharacters = safeMaxCharacters(options.maxJobDescriptionChars);
  const characterCount = options.jdText.length;
  const descriptionTooLong = characterCount > maxCharacters;
  const jobUrlInvalid = Boolean(options.jdUrl.trim() && !options.normalizedJobUrl);
  const hasTarget = options.mode === "text"
    ? Boolean(options.jdText.trim())
    : Boolean(options.normalizedJobUrl);
  const invalid = options.mode === "text" ? descriptionTooLong : jobUrlInvalid;
  const activeValue = options.mode === "text" ? options.jdText.trim() : options.normalizedJobUrl ?? "";
  const overLimit = Math.max(0, characterCount - maxCharacters);

  return {
    activeValue,
    characterCount,
    countLabel: `${count(characterCount)} / ${count(maxCharacters)} characters`,
    descriptionTooLong,
    disabledReason: descriptionTooLong && options.mode === "text"
      ? `${count(overLimit)} ${overLimit === 1 ? "character" : "characters"} over the ${count(maxCharacters)} character limit. Shorten the pasted description to continue.`
      : jobUrlInvalid && options.mode === "url"
        ? "Enter a public job URL such as jobs.example.com/role before running Tailor."
        : "",
    hasTarget,
    invalid,
    jobUrlInvalid,
    nearDescriptionLimit: !descriptionTooLong && characterCount >= Math.floor(maxCharacters * 0.9),
  };
}

export function activeTargetPayload(options: Pick<TargetInputOptions, "mode" | "jdText" | "normalizedJobUrl">) {
  if (options.mode === "text") {
    const jdText = options.jdText.trim();
    return jdText ? { jd_text: jdText } : {};
  }

  return options.normalizedJobUrl ? { jd_url: options.normalizedJobUrl } : {};
}
