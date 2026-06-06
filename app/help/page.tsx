import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { supportRequestHref } from "../lib/supportRequests";
import { HelpSearch } from "./HelpSearch";

export const metadata: Metadata = {
  title: "Help Center",
  description: "RoleForge AI help for account access, saved projects, exports, billing, and resume tailoring workflows.",
  alternates: {
    canonical: "/help",
  },
};

export type HelpSection = {
  title: string;
  body: readonly string[];
};

export type HelpQuickLink = {
  href: string;
  icon: "file" | "layers" | "settings" | "mail" | "scan" | "lock" | "sparkle";
  label: string;
  detail: string;
};

type HelpActionRoute = {
  title: string;
  issue: string;
  firstStep: string;
  href: string;
  supportHref: string;
  icon: "file" | "download" | "lock" | "settings";
};

const helpSections: readonly HelpSection[] = [
  {
    title: "Start a resume run",
    body: [
      "Open the studio, add a resume, then provide either a job description or a public job posting URL. Pasted job text is the most reliable target input.",
      "After a completed run, review the tailored draft, fit signals, keyword notes, cover letter, and interview prep before using any output.",
    ],
  },
  {
    title: "Account and profile",
    body: [
      "Use the profile button in Studio, Templates, or Settings to reach saved projects, usage, billing, security, account export, and sign-out controls.",
      "Settings lets you save a display name, update your email when Supabase allows it, manage optional product update email, download an account summary, and delete the account after active Premium billing is canceled.",
    ],
  },
  {
    title: "Saved projects",
    body: [
      "Completed signed-in runs can save to your account so you can restore drafts, track application stages, rename projects, and remove saved work from Settings.",
      "Browser history can still hold local runs, and the Studio account menu can save eligible browser runs into your signed-in account.",
    ],
  },
  {
    title: "Exports and templates",
    body: [
      "Free accounts can export PDF. Premium accounts unlock DOCX and TXT exports while Premium access is active.",
      "The Templates page controls the resume direction RoleForge sends with new exports. You can change the direction before opening the studio.",
    ],
  },
  {
    title: "Premium and billing",
    body: [
      "Checkout and subscription management happen through Stripe. Premium access updates after the Stripe checkout or billing portal change syncs to your account.",
      "If billing is unavailable or still syncing, the free signed-in studio remains available with PDF export and saved project controls.",
    ],
  },
  {
    title: "When something looks stuck",
    body: [
      "If a saved project, export, or billing change is taking a moment, refresh Settings first. Sign out and back in if account details look stale.",
      "For exports, confirm the selected format is allowed for your plan and that the latest run has finished before downloading.",
    ],
  },
] as const;

const quickLinks: readonly HelpQuickLink[] = [
  { href: "/app", icon: "file", label: "Open studio", detail: "Build or restore a resume workflow." },
  { href: "/templates", icon: "layers", label: "Browse templates", detail: "Choose the default export direction." },
  { href: "/settings", icon: "settings", label: "Account settings", detail: "Manage profile, projects, exports, and billing." },
  {
    href: supportRequestHref({
      category: "workflow",
      subject: "Workflow or export issue",
      contextUrl: "/help",
    }),
    icon: "mail",
    label: "Contact support",
    detail: "Send account-linked workflow or billing details.",
  },
  { href: "/status", icon: "scan", label: "System status", detail: "Check workflow, export, account, and billing readiness." },
  { href: "/updates", icon: "sparkle", label: "Product updates", detail: "Review recent shipped improvements." },
  { href: "/privacy", icon: "lock", label: "Privacy", detail: "Review how account and workflow data is handled." },
] as const;

const helpActionRoutes: readonly HelpActionRoute[] = [
  {
    title: "Workflow is stuck",
    issue: "Tailor, upload, generated assets, or request IDs look stalled.",
    firstStep: "Open Status, then retry from Studio after the workflow service is healthy.",
    href: "/status",
    supportHref: supportRequestHref({
      category: "workflow",
      subject: "Workflow is stuck",
      contextUrl: "/help#try-first",
    }),
    icon: "file",
  },
  {
    title: "Export is missing",
    issue: "A PDF, DOCX, or TXT download is locked, unavailable, or attached to an older run.",
    firstStep: "Check export access in Settings and confirm the selected format matches your plan.",
    href: "/settings#exports",
    supportHref: supportRequestHref({
      category: "exports",
      subject: "Export download issue",
      contextUrl: "/settings#exports",
    }),
    icon: "download",
  },
  {
    title: "Premium looks out of sync",
    issue: "Checkout finished, billing changed, or the current plan badge does not match access.",
    firstStep: "Refresh Billing in Settings; Premium access updates after the Stripe sync reaches the account.",
    href: "/settings#billing",
    supportHref: supportRequestHref({
      category: "billing",
      subject: "Premium access sync issue",
      contextUrl: "/settings#billing",
    }),
    icon: "lock",
  },
  {
    title: "Saved work is missing",
    issue: "A project, restore action, application stage, or saved export is not where expected.",
    firstStep: "Open Saved projects in Settings and compare account-saved runs with browser history in Studio.",
    href: "/settings#projects",
    supportHref: supportRequestHref({
      category: "saved-projects",
      subject: "Saved project issue",
      contextUrl: "/settings#projects",
    }),
    icon: "settings",
  },
] as const;

export default function HelpPage() {
  return (
    <main className="legal-shell help-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
          <PublicAccountMenu
            supportHref={supportRequestHref({
              category: "workflow",
              subject: "Help center question",
              contextUrl: "/help",
            })}
          />
        </div>
      </header>

      <section className="legal-hero help-hero" aria-labelledby="help-title">
        <div>
          <div className="eyebrow">Help center</div>
          <h1 id="help-title" className="display">Use RoleForge with fewer surprises.</h1>
          <p>
            Practical answers for account access, saved work, exports, templates, and Premium billing.
          </p>
        </div>
        <div className="legal-hero-card help-hero-card" aria-label="Help summary">
          <RoleForgeIcon name="settings" size={18} />
          <span>Profile menu links to saved work, billing, security, and Help</span>
          <span>Free export is PDF; Premium adds DOCX and TXT</span>
          <span>Review generated output before using it in an application</span>
        </div>
      </section>

      <section className="help-action-routes" id="try-first" aria-labelledby="help-action-title">
        <div className="help-action-head">
          <div>
            <span className="eyebrow">Try this first</span>
            <h2 id="help-action-title">Route the issue to the right place.</h2>
          </div>
          <p>
            Start with the account or status page that owns the live state, then send a prefilled support request if the issue still looks wrong.
          </p>
        </div>
        <div className="help-action-grid">
          {helpActionRoutes.map((route) => (
            <article className="help-action-card" key={route.title}>
              <span aria-hidden="true"><RoleForgeIcon name={route.icon} size={16} /></span>
              <div>
                <strong>{route.title}</strong>
                <p>{route.issue}</p>
                <small>{route.firstStep}</small>
              </div>
              <div className="help-action-buttons">
                <Link className="btn btn-soft btn-sm" href={route.href}>Open check</Link>
                <Link className="btn btn-ghost btn-sm" href={route.supportHref}>Ask support</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <HelpSearch quickLinks={quickLinks} helpSections={helpSections} />

      <section className="legal-footer-card" aria-label="Help footer">
        <div>
          <span className="eyebrow">Need account controls?</span>
          <strong>Settings has the live account state.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/settings">Open settings</Link>
          <Link className="btn btn-soft btn-sm" href="/support">Support</Link>
          <Link className="btn btn-soft btn-sm" href="/updates">Updates</Link>
          <Link className="btn btn-soft btn-sm" href="/terms">Terms</Link>
          <Link className="btn btn-soft btn-sm" href="/privacy">Privacy</Link>
        </div>
      </section>
    </main>
  );
}
