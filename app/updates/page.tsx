import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../components/Brand";
import { PublicAccountMenu } from "../components/PublicAccountMenu";
import { RoleForgeIcon, type RoleForgeIconName } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { supportRequestHref } from "../lib/supportRequests";

export const metadata: Metadata = {
  title: "Product Updates",
  description: "Material RoleForge AI product updates for account controls, saved projects, exports, billing, support, and public guidance.",
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
  "Material changes only",
  "Grouped by product area",
  "Published after behavior ships",
] as const;

const updateSignals = [
  {
    label: "Cadence",
    value: "Material notes",
    detail: "Grouped updates instead of a noisy daily feed.",
    icon: "sparkle" as const,
  },
  {
    label: "Scope",
    value: "Shipped behavior",
    detail: "Only account, workflow, export, billing, and support changes that are live.",
    icon: "check" as const,
  },
  {
    label: "Live state",
    value: "Status + Settings",
    detail: "Operational health stays on Status; account state stays in Settings.",
    icon: "scan" as const,
  },
] as const;

const updates: readonly UpdateItem[] = [
  {
    title: "Account workspace, support history, and preferences",
    date: "June 2026",
    eyebrow: "Account",
    icon: "mail",
    summary: "Settings is now the account home for profile details, preferences, saved work, support references, and privacy controls.",
    details: [
      "Communication preferences are account-backed and included in account exports.",
      "Support requests now keep a visible RF reference in Support and Settings history.",
    ],
    actionHref: "/settings",
    actionLabel: "Open settings",
  },
  {
    title: "Premium billing and export access are clearer",
    date: "June 2026",
    eyebrow: "Billing",
    icon: "layers",
    summary: "Free PDF export and Premium DOCX/TXT access are separated across Studio, Settings, and saved project downloads.",
    details: [
      "Checkout and billing management use Stripe-hosted flows.",
      "Restored projects respect the current plan instead of exposing stale Premium-only links.",
    ],
    actionHref: "/settings#billing",
    actionLabel: "Open billing",
  },
  {
    title: "Saved project recovery is easier to scan",
    date: "June 2026",
    eyebrow: "Projects",
    icon: "settings",
    summary: "Signed-in runs can be restored, renamed, staged, exported, and removed from a more organized project view.",
    details: [
      "Project rows group restore, stage, export, and delete actions more predictably.",
      "Eligible browser-history runs can be saved into the signed-in account.",
    ],
    actionHref: "/settings#projects",
    actionLabel: "Open projects",
  },
  {
    title: "Templates and public guidance were consolidated",
    date: "June 2026",
    eyebrow: "Guidance",
    icon: "scan",
    summary: "The public pages now route common questions to Help, Status, Support, Settings, Privacy, Terms, and Updates.",
    details: [
      "Help includes searchable answers and short issue routing.",
      "Templates make the selected resume direction visible before Studio.",
    ],
    actionHref: "/help",
    actionLabel: "Open help",
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
          <h1 id="updates-title" className="display">RoleForge product notes.</h1>
          <p>
            Short release notes for shipped account, workflow, export, billing, and support improvements.
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
          <strong>Useful signal, not a patch-by-patch feed.</strong>
        </div>
        <p>
          Updates stay grouped around product behavior. Operational availability belongs on Status, and account-specific state belongs in Settings.
        </p>
      </section>

      <section className="updates-signal-grid" aria-label="Updates reading guide">
        {updateSignals.map((signal) => (
          <article className="updates-signal-card" key={signal.label}>
            <span aria-hidden="true"><RoleForgeIcon name={signal.icon} size={16} /></span>
            <div>
              <small>{signal.label}</small>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </div>
          </article>
        ))}
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
          <span className="eyebrow">Current state</span>
          <strong>Status and Settings stay authoritative.</strong>
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
