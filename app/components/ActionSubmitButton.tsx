"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";

import { RoleForgeIcon, type RoleForgeIconName } from "./RoleForgeIcons";
import { useNativeActionFormStatus } from "./NativeActionForm";

type ActionSubmitButtonProps = {
  ariaPressed?: boolean;
  className?: string;
  disabled?: boolean;
  icon?: RoleForgeIconName;
  iconSize?: number;
  label: string;
  name?: string;
  pendingLabel: string;
  title?: string;
  value?: string;
};

export function ActionSubmitButton({
  ariaPressed,
  className = "",
  disabled = false,
  icon,
  iconSize = 12,
  label,
  name,
  pendingLabel,
  title,
  value,
}: ActionSubmitButtonProps) {
  const { data, pending } = useFormStatus();
  const nativeStatus = useNativeActionFormStatus();
  const submitKey = useId();
  const nativeSubmissionActive = nativeStatus.pending && nativeStatus.submitKey === submitKey;
  const formPending = pending || nativeStatus.pending;
  const activeSubmission = (pending && (!name || data?.get(name) === value)) || nativeSubmissionActive;

  return (
    <button
      aria-busy={activeSubmission ? "true" : undefined}
      aria-pressed={ariaPressed}
      className={`action-submit${activeSubmission ? " is-pending" : ""}${className ? ` ${className}` : ""}`}
      data-submit-key={submitKey}
      disabled={disabled || formPending}
      name={name}
      title={title}
      type="submit"
      value={value}
    >
      {activeSubmission ? <span className="action-submit-spinner" aria-hidden="true" /> : null}
      <span>{activeSubmission ? pendingLabel : label}</span>
      {!activeSubmission && icon ? <RoleForgeIcon name={icon} size={iconSize} /> : null}
    </button>
  );
}
