export type LoginNoticeTone = "success" | "error" | "neutral" | "info";

export function loginNoticeCopy(account: string | undefined) {
  switch (account) {
    case "signin-required":
      return "Sign in to start tailoring resumes and keep saved projects tied to your account.";
    case "check-email":
      return "Check your email for the secure sign-in link.";
    case "signed-out":
      return "You are signed out.";
    case "account-not-configured":
      return "Sign-in is temporarily unavailable. Try again shortly.";
    case "signin-error":
      return "Sign-in could not finish. Try Google or send a new email link.";
    default:
      return "Choose Google or a secure email link to continue to the studio.";
  }
}

export function loginNoticeTone(account: string | undefined): LoginNoticeTone {
  if (account === "check-email") return "success";
  if (account === "signin-error" || account === "account-not-configured") return "error";
  if (account === "signed-out") return "neutral";
  return "info";
}
