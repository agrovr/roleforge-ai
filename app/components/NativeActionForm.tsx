"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

type NativeActionFormStatus = {
  pending: boolean;
  submitKey: string | null;
};

const NativeActionFormContext = createContext<NativeActionFormStatus>({
  pending: false,
  submitKey: null,
});

type NativeActionFormProps = {
  action: string;
  children: ReactNode;
  className?: string;
  id?: string;
  method?: "get" | "post";
};

export function useNativeActionFormStatus() {
  return useContext(NativeActionFormContext);
}

export function NativeActionForm({
  action,
  children,
  className,
  id,
  method = "post",
}: NativeActionFormProps) {
  const [status, setStatus] = useState<NativeActionFormStatus>({ pending: false, submitKey: null });

  return (
    <NativeActionFormContext.Provider value={status}>
      <form
        action={action}
        className={className}
        id={id}
        method={method}
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          flushSync(() => {
            setStatus({
              pending: true,
              submitKey: submitter instanceof HTMLButtonElement ? submitter.dataset.submitKey ?? null : null,
            });
          });
        }}
      >
        {children}
      </form>
    </NativeActionFormContext.Provider>
  );
}
