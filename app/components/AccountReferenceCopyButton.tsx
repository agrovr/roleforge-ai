"use client";

import { useState } from "react";

import { RoleForgeIcon } from "./RoleForgeIcons";
import { writeClipboardText } from "../lib/clipboard";

export function AccountReferenceCopyButton({
  className = "settings-account-email-copy settings-account-reference-copy",
  idleLabel = "Copy ref",
  iconSize = 13,
  referenceLabel,
}: {
  className?: string;
  idleLabel?: string;
  iconSize?: number;
  referenceLabel: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyReference() {
    const copied = await writeClipboardText(referenceLabel);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const label = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : idleLabel;

  return (
    <button
      className={className}
      type="button"
      aria-label={`Copy account reference ${referenceLabel}`}
      onClick={() => void copyReference()}
    >
      <RoleForgeIcon name={copyState === "copied" ? "check" : "copy"} size={iconSize} />
      {label}
    </button>
  );
}
