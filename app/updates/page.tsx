import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { supportRequestHref } from "../lib/supportRequests";

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
  actionHref: string;
  actionLabel: string;
};

const updatePrinciples = [
  "Published only after behavior ships",
  "Grouped by release theme, not every small patch",
  "No unsupported claims or roadmap promises",
] as const;

const updates: readonly UpdateItem[] = [
  {
    title: "Account controls are now more complete",
    date: "June 2026",
    eyebrow: "Account workspace",
    icon: "mail",
    summary: "Settings now feels like the home for profile, preferences, support history, and privacy controls.",
    details: [
      "Communication preferences are saved to the account profile and included in account exports.",
      "Data and privacy controls route export, deletion, policy, and support questions to the right place.",
    ],
    actionHref: "/settings",
    actionLabel: "Open settings",
  },
  {
    title: "Support and status paths are clearer",
    date: "June 2026",
    eyebrow: "Support",
    icon: "mail",
    summary: "Help, Status, Support, and Settings now send common issues to the surface that owns the live state.",
    details: [
      "Support requests are saved to the signed-in account with a safe RF reference and visible request history.",
      "Common workflow, export, billing, saved-project, and privacy questions open prefilled support requests.",
    ],
    actionHref: "/support",
    actionLabel: "Open support",
  },
  {
    title: "Premium and export behavior is explicit",
    date: "June 2026",
    eyebrow: "Billing and exports",
    icon: "layers",
    summary: "The site now separates free PDF export from Premium DOCX/TXT access and uses real billing state.",
    details: [
      "Checkout and billing management use Stripe, while Settings explains subscription sync and cancellation state.",
      "Saved projects and restored downloads respect the current account entitlement instead of exposing stale premium links.",
    ],
    actionHref: "/settings#billing",
    actionLabel: "Open billing",
  },
  {
    title: "Saved work is easier to recover",
    date: "June 2026",
    eyebrow: "Projects",
    icon: "settings",
    summary: "Signed-in runs can be restored, renamed, staged, and managed from a cleaner account workspace.",
    details: [
      "Project rows now keep stage controls, downloads, restore actions, and removal controls readable.",
      "Eligible browser-history runs can be saved into the signed-in account for later restore.",
    ],
    actionHref: "/settings#projects",
    actionLabel: "Open projects",
  },
  {
    title: "Public guidance is easier to scan",
    date: "June 2026",
    eyebrow: "Public pages",
    icon: "scan",
    summary: "Help, Status, Templates, Support, Updates, Privacy, and Terms are now discoverable and consistent.",
    details: [
      "Help includes searchable guidance and direct routes for common account, billing, export, and workflow issues.",
      "Public account menus preserve the destination through sign-in when a protected page is required.",
    ],
    actionHref: "/help",
    actionLabel: "Open help",
  },
  {
    title: "Template direction is visible before Studio",
    date: "May 2026",
    eyebrow: "Templates",
    icon: "file",
    summary: "The Templates page makes the selected resume direction visible before starting a new run.",
    details: [
      "Template choices carry into new studio runs and exports.",
      "The public template gallery explains available directions without promising unsupported outcomes.",
    ],
    actionHref: "/templates",
    actionLabel: "Browse templates",
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
          <PublicAccountMenu
            supportHref={supportRequestHref({
              category: "workflow",
              subject: "Product updates question",
              contextUrl: "/updates",
            })}
          />
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
          {updatePrinciples.map((principle) => (
            <span key={principle}>{principle}</span>
          ))}
        </div>
      </section>

      <section className="updates-overview" aria-label="Updates publishing standard">
        <div>
          <span className="eyebrow">Release notes</span>
          <strong>Short, grouped, and shipped.</strong>
        </div>
        <p>
          This page highlights material product changes. Operational availability stays on Status, and account-specific state stays in Settings.
        </p>
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
              <div className="updates-card-actions">
                <Link className="btn btn-soft btn-sm" href={item.actionHref}>
                  {item.actionLabel} <RoleForgeIcon name="arrow" size={13} />
                </Link>
              </div>
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
          <Link className="btn btn-soft btn-sm" href="/support">Support</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
        </div>
      </section>
    </main>
  );
}
