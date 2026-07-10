"use client";

import { useFormStatus } from "react-dom";

import { RoleForgeIcon, type RoleForgeIconName } from "@/app/components/RoleForgeIcons";

type SupportSubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  icon: RoleForgeIconName;
  label: string;
  name?: string;
  pendingLabel: string;
  value?: string;
};

export function SupportSubmitButton({
  className = "admin-support-action",
  disabled = false,
  icon,
  label,
  name,
  pendingLabel,
  value,
}: SupportSubmitButtonProps) {
  const { data, pending } = useFormStatus();
  const activeSubmission = pending && (!name || data?.get(name) === value);

  return (
    <button
      className={`${className}${activeSubmission ? " is-pending" : ""}`}
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={activeSubmission}
    >
      <RoleForgeIcon name={activeSubmission ? "settings" : icon} size={14} />
      <span>{activeSubmission ? pendingLabel : label}</span>
    </button>
  );
}
