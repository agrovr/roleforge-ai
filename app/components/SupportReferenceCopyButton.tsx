"use client";

import { useState } from "react";

import { writeClipboardText } from "../lib/clipboard";
import { RoleForgeIcon } from "./RoleForgeIcons";

export function SupportReferenceCopyButton({ referenceLabel }: { referenceLabel: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyReference() {
    const copied = await writeClipboardText(referenceLabel);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const label = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy ref";

  return (
    <button
      className="support-reference-copy"
      type="button"
      aria-label={`Copy support reference ${referenceLabel}`}
      onClick={() => void copyReference()}
    >
      <RoleForgeIcon name={copyState === "copied" ? "check" : "copy"} size={13} />
      {label}
    </button>
  );
}
