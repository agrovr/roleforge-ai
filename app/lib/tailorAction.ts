export type TailorActionInput = {
  accountConfigured: boolean;
  signedIn: boolean;
  limitReached: boolean;
  busy: boolean;
  readingResume: boolean;
  uploadFailed: boolean;
  restoredWithoutFile: boolean;
  hasResult: boolean;
  hasFile: boolean;
  hasTarget: boolean;
  targetInvalid: boolean;
  backendReady: boolean;
};

export type TailorActionState = {
  canRun: boolean;
  label: string;
  disabledReason: string;
};

export function tailorActionState(input: TailorActionInput): TailorActionState {
  const canRun = Boolean(
    input.backendReady &&
      input.hasFile &&
      input.hasTarget &&
      !input.targetInvalid &&
      !input.busy &&
      !input.readingResume &&
      !input.uploadFailed &&
      (!input.accountConfigured || input.signedIn) &&
      !input.limitReached,
  );

  if (input.accountConfigured && !input.signedIn) {
    return {
      canRun,
      label: "Sign in to run",
      disabledReason: canRun ? "" : "Sign in before running the studio workflow.",
    };
  }

  if (input.limitReached) {
    return {
      canRun,
      label: "Monthly limit reached",
      disabledReason: canRun ? "" : "Your free monthly run limit is reached. Upgrade or wait for the next cycle.",
    };
  }

  if (input.busy) {
    return {
      canRun,
      label: "Tailoring...",
      disabledReason: canRun ? "" : "The current workflow is still running.",
    };
  }

  if (input.readingResume) {
    return {
      canRun,
      label: "Reading resume...",
      disabledReason: canRun ? "" : "The resume is still being read.",
    };
  }

  if (input.uploadFailed) {
    return {
      canRun,
      label: "Replace resume",
      disabledReason: canRun ? "" : "Replace the resume file before running Tailor.",
    };
  }

  if (input.restoredWithoutFile) {
    return {
      canRun,
      label: "Upload to re-tailor",
      disabledReason: canRun ? "" : "Upload the source resume again before re-tailoring this restored run.",
    };
  }

  if (!input.hasFile) {
    return {
      canRun,
      label: "Upload to run",
      disabledReason: canRun ? "" : "Upload a resume file before running Tailor.",
    };
  }

  if (input.targetInvalid) {
    return {
      canRun,
      label: "Fix job target",
      disabledReason: canRun ? "" : "Fix the active job target before running Tailor.",
    };
  }

  if (input.hasResult) {
    return {
      canRun,
      label: "Re-tailor",
      disabledReason: canRun ? "" : "Complete the required fields before running Tailor.",
    };
  }

  if (!input.hasTarget) {
    return {
      canRun,
      label: "Add target to run",
      disabledReason: canRun ? "" : "Add a job target before running Tailor.",
    };
  }

  return {
    canRun,
    label: "Run Tailor",
    disabledReason: canRun ? "" : input.backendReady ? "Complete the required fields before running Tailor." : "Resume tailoring is temporarily unavailable. Try again shortly.",
  };
}
