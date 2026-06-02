import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";

export const metadata: Metadata = {
  title: "Product Updates",
  description: "Recent RoleForge AI product updates for account controls, saved projects, exports, billing readiness, and workflow status.",
  alternates: {
    canonical: "/updates",
  },
};

type UpdateItem = {
  title: string;
  date: string;
  eyebrow: string;
  icon: RoleForgeIconName;
  summary: string;
  details: readonly string[];
};

const updates: readonly UpdateItem[] = [
  {
    title: "Profile controls now follow you across the site",
    date: "June 2, 2026",
    eyebrow: "Account menus",
    icon: "settings",
    summary: "Signed-in users can reach the same account controls from the landing page, Studio, Templates, and Settings.",
    details: [
      "The landing page, Studio, Templates, and Settings expose account menus with plan, export, billing, status, security, and sign-out controls.",
      "Signed-in users can reach account export, preferences, saved projects, Help, and System status without leaving the current surface.",
    ],
  },
  {
    title: "System status is public",
    date: "June 2, 2026",
    eyebrow: "Operations",
    icon: "scan",
    summary: "The Status page reports account, workflow, export, and Premium billing readiness from the current deployment.",
    details: [
      "Status reports account access, resume workflow capabilities, export availability, and Premium billing readiness from live configuration and backend capabilities.",
      "Robots and sitemap now expose public Help, Status, Updates, legal, and template pages while protected routes stay excluded.",
    ],
  },
  {
    title: "Settings is now an account workspace",
    date: "June 1, 2026",
    eyebrow: "Settings",
    icon: "lock",
    summary: "Settings now covers profile, security, preferences, saved projects, usage, exports, and billing in one signed-in workspace.",
    details: [
      "Settings includes profile display name, email update controls, account export, guarded deletion, security metadata, saved projects, usage, export preferences, and billing actions.",
      "Saved projects can be renamed, restored, staged, and removed from the account area.",
    ],
  },
  {
    title: "Free and Premium export rules are explicit",
    date: "May 31, 2026",
    eyebrow: "Exports",
    icon: "layers",
    summary: "Template selection is visible before opening the Studio, and export access is tied to the active plan.",
    details: [
      "Free accounts keep PDF export.",
      "Premium access unlocks DOCX and TXT while the subscription is active.",
      "Template direction can be chosen before new studio runs and exports.",
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main className="legal-shell updates-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <Link className="btn btn-soft btn-sm" href="/status">Status</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="legal-hero updates-hero" aria-labelledby="updates-title">
        <div>
          <div className="eyebrow">Product updates</div>
          <h1 id="updates-title" className="display">What changed in RoleForge.</h1>
          <p>
            A factual log of shipped workflow, account, export, and billing improvements.
          </p>
        </div>
        <div className="legal-hero-card updates-hero-card" aria-label="Updates summary">
          <RoleForgeIcon name="sparkle" size={18} />
          <span>Updates describe shipped product behavior</span>
          <span>Status has the current operational view</span>
          <span>No fake launch stats or unsupported roadmap promises</span>
        </div>
      </section>

      <section className="updates-timeline" aria-label="Recent product updates">
        {updates.map((item) => (
          <article className="updates-card" key={item.title}>
            <div className="updates-card-icon">
              <RoleForgeIcon name={item.icon} size={18} />
            </div>
            <div className="updates-card-copy">
              <div className="updates-card-meta">
                <time>{item.date}</time>
                <span>{item.eyebrow}</span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.summary}</p>
              <ul>
                {item.details.map((detail) => (
                  <li key={detail}><RoleForgeIcon name="check" size={13} />{detail}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <section className="legal-footer-card" aria-label="Updates footer">
        <div>
          <span className="eyebrow">Need current state?</span>
          <strong>Status and Settings stay live.</strong>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/status">Open status</Link>
          <Link className="btn btn-soft btn-sm" href="/settings">Open settings</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
        </div>
      </section>
    </main>
  );
}
