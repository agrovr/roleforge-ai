import type { Metadata } from "next";

import { LegalPage } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using RoleForge AI, including account access, acceptable use, AI output review, exports, and billing.",
  alternates: {
    canonical: "/terms",
  },
};

const sections = [
  {
    title: "Using the service",
    body: [
      "RoleForge AI is a resume tailoring workspace for signed-in users. You are responsible for the files, job targets, and account activity connected to your use.",
      "You should provide only information you have the right to use and process through the service.",
    ],
  },
  {
    title: "AI-assisted output",
    body: [
      "RoleForge can generate resume drafts, review notes, cover letter text, and interview prep from the materials you provide.",
      "Generated output may be incomplete, inaccurate, or unsuitable for a particular application. You are responsible for reviewing, editing, and deciding whether to use it.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not misuse the service, attempt to bypass sign-in or plan limits, overload the workflow, scrape protected routes, or upload malicious files.",
      "Do not use RoleForge to create misleading applications, impersonate another person, or process information you are not authorized to provide.",
    ],
  },
  {
    title: "Accounts and saved projects",
    body: [
      "You are responsible for keeping access to your account secure. Saved projects and export access are tied to the signed-in account that created them.",
      "RoleForge may limit or suspend access when use creates risk for the service, other users, payment integrity, or platform security.",
    ],
  },
  {
    title: "Premium billing",
    body: [
      "Premium features are granted only when the account has an active qualifying Stripe subscription recorded by RoleForge.",
      "If a subscription is canceled, incomplete, past due, or cannot be verified, Premium access can fall back to the free plan. Free PDF export remains separate from Premium DOCX and TXT export access.",
    ],
  },
  {
    title: "Availability and changes",
    body: [
      "RoleForge may change, pause, or remove features as the product improves. The service is provided without a guarantee that every workflow will be uninterrupted or error-free.",
      "These terms may be updated as the product, payment flow, or data practices change.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Use"
      intro="The practical rules for using RoleForge AI, including account access, generated drafts, saved projects, exports, and Premium billing."
      sections={sections}
    />
  );
}
