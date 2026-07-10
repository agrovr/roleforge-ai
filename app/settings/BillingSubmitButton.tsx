"use client";

import { ActionSubmitButton } from "../components/ActionSubmitButton";

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
  return (
    <ActionSubmitButton
      className={className}
      disabled={!ready}
      label={ready ? readyLabel : unavailableLabel}
      pendingLabel={pendingLabel}
      title={title}
    />
  );
}
