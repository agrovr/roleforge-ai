"use client";

import { useState } from "react";

import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { writeClipboardText } from "../lib/clipboard";

export function AccountEmailCopyButton({ email }: { email: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyEmail() {
    const copied = await writeClipboardText(email);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const label = copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy email";

  return (
    <button
      className="settings-account-email-copy"
      type="button"
      aria-label={`Copy account email ${email}`}
      onClick={() => void copyEmail()}
    >
      <RoleForgeIcon name={copyState === "copied" ? "check" : "copy"} size={13} />
      {label}
    </button>
  );
}
