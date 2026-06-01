"use client";

import { useFormStatus } from "react-dom";

type BillingSubmitButtonProps = {
  className: string;
  ready: boolean;
  readyLabel: string;
  pendingLabel: string;
  unavailableLabel?: string;
  title?: string;
};

export function BillingSubmitButton({
  className,
  ready,
  readyLabel,
  pendingLabel,
  unavailableLabel = "Unavailable",
  title,
}: BillingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const disabled = !ready || pending;

  return (
    <button
      aria-busy={pending ? "true" : undefined}
      className={className}
      disabled={disabled}
      title={title}
      type="submit"
    >
      {ready ? (pending ? pendingLabel : readyLabel) : unavailableLabel}
    </button>
  );
}
