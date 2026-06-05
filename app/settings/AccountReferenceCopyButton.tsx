"use client";

import { useState } from "react";

import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { writeClipboardText } from "../lib/clipboard";

export function AccountReferenceCopyButton({ referenceLabel }: { referenceLabel: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyReference() {
    const copied = await writeClipboardText(referenceLabel);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const label = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy ref";

  return (
    <button
      className="settings-account-email-copy settings-account-reference-copy"
      type="button"
      aria-label={`Copy account reference ${referenceLabel}`}
      onClick={() => void copyReference()}
    >
      <RoleForgeIcon name={copyState === "copied" ? "check" : "copy"} size={13} />
      {label}
    </button>
  );
}
