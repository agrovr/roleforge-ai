import type { Metadata } from "next";

import { LegalPage } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How RoleForge AI handles account, resume, job target, saved project, and billing data.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "What RoleForge collects",
    body: [
      "RoleForge AI collects the account information needed to sign you in, such as your email address, provider profile name when available, saved display name, and communication preference choices.",
      "When you use the studio, the app receives the resume file or text you provide, the job target you enter, generated results, export choices, and saved project details tied to your account.",
    ],
  },
  {
    title: "How your data is used",
    body: [
      "Your resume and job target are used to run the tailoring workflow, show previews, create exports, save completed projects, and help you restore prior runs.",
      "Communication preferences are used to remember whether optional product update email is enabled. Account, billing, security, and support messages may still be sent when needed to provide the service.",
      "Generated content can be processed by the backend and AI service providers that power the workflow. You should review all output before using it in an application.",
    ],
  },
  {
    title: "Saved projects and local history",
    body: [
      "Signed-in completed runs can be saved to your account so they can reopen in the studio. Some history can also stay in your browser as local fallback history.",
      "You can clear local history from the studio and manage saved projects from the app surfaces that expose project controls.",
    ],
  },
  {
    title: "Billing data",
    body: [
      "When Premium billing is available, checkout and billing management are handled by Stripe. RoleForge receives subscription state and customer identifiers needed to grant plan access.",
      "RoleForge does not store full card numbers. Stripe handles payment details through its hosted checkout and customer portal.",
    ],
  },
  {
    title: "Sharing and retention",
    body: [
      "RoleForge does not sell personal resume data. Data is shared with service providers only as needed to provide auth, storage, AI processing, exports, billing, security, and hosting.",
      "You can download an account summary from Settings, including profile and communication preference records. You can delete a signed-in account from Settings after canceling any active Premium subscription.",
      "Account and saved project data may remain while your account is active or as needed for security, billing, operations, and legal obligations.",
    ],
  },
  {
    title: "Security",
    body: [
      "The production studio requires sign-in, and protected routes are designed to reject anonymous access. No internet service can promise perfect security.",
      "Use a private device for sensitive resumes, sign out on shared devices, and avoid uploading information you do not want processed for the workflow.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="A plain-language view of how RoleForge AI handles account access, resumes, job targets, saved projects, exports, and billing state."
      sections={sections}
    />
  );
}
