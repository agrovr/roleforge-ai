import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Help Center",
  description: "RoleForge AI help for account access, saved projects, exports, billing, and resume tailoring workflows.",
  alternates: {
    canonical: "/help",
  },
};

const helpSections = [
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
      "Settings lets you save a display name, update your email when Supabase allows it, download an account summary, and delete the account after active Premium billing is canceled.",
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

const quickLinks = [
  { href: "/app", icon: "file" as const, label: "Open studio", detail: "Build or restore a resume workflow." },
  { href: "/templates", icon: "layers" as const, label: "Browse templates", detail: "Choose the default export direction." },
  { href: "/settings", icon: "settings" as const, label: "Account settings", detail: "Manage profile, projects, exports, and billing." },
  { href: "/privacy", icon: "lock" as const, label: "Privacy", detail: "Review how account and workflow data is handled." },
] as const;

export default function HelpPage() {
  return (
    <main className="legal-shell help-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
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

      <nav className="help-quick-grid" aria-label="Help quick links">
        {quickLinks.map((item) => (
          <Link className="help-quick-link" href={item.href} key={item.href}>
            <span><RoleForgeIcon name={item.icon} size={16} /></span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </Link>
        ))}
      </nav>

      <section className="legal-grid" aria-label="Help topics">
        {helpSections.map((section) => (
          <article className="legal-card" key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>

      <section className="legal-footer-card" aria-label="Help footer">
        <div>
          <span className="eyebrow">Need account controls?</span>
          <strong>Settings has the live account state.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/settings">Open settings</Link>
          <Link className="btn btn-soft btn-sm" href="/terms">Terms</Link>
          <Link className="btn btn-soft btn-sm" href="/privacy">Privacy</Link>
        </div>
      </section>
    </main>
  );
}
