import Link from "next/link";

import { Brand } from "./components/Brand";
import { RoleForgeIcon } from "./components/RoleForgeIcons";
import { ThemeToggle } from "./components/ThemeToggle";

const recoveryLinks = [
  {
    href: "/templates",
    icon: "layers" as const,
    title: "Browse templates",
    detail: "Choose a resume direction before opening the studio.",
  },
  {
    href: "/status",
    icon: "chart" as const,
    title: "Check status",
    detail: "See the current account, workflow, export, and billing readiness view.",
  },
  {
    href: "/support",
    icon: "mail" as const,
    title: "Contact support",
    detail: "Send a signed-in request with a RoleForge reference.",
  },
];

export default function NotFound() {
  return (
    <main className="legal-shell not-found-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="not-found-hero" aria-labelledby="not-found-title">
        <div className="not-found-copy">
          <span className="eyebrow">Route not found</span>
          <h1 id="not-found-title" className="display">This page slipped out of the stack.</h1>
          <p>
            The link may have moved, expired, or been typed differently. You can return to the product, open the studio, or use the recovery links below.
          </p>
          <div className="not-found-actions">
            <Link className="btn primary-button" href="/">
              Home <RoleForgeIcon name="arrow" size={16} />
            </Link>
            <Link className="btn btn-soft" href="/app">
              Studio <RoleForgeIcon name="file" size={16} />
            </Link>
          </div>
        </div>

        <aside className="not-found-docket" aria-label="404 recovery packet">
          <div className="not-found-code">404</div>
          <div className="not-found-docket-grid" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="not-found-docket-footer">
            <span><RoleForgeIcon name="search" size={14} /> Route lookup</span>
            <strong>No matching page</strong>
          </div>
        </aside>
      </section>

      <section className="not-found-recovery" aria-label="Recovery links">
        {recoveryLinks.map((link) => (
          <Link className="not-found-recovery-card" href={link.href} key={link.href}>
            <span className="not-found-recovery-icon" aria-hidden="true">
              <RoleForgeIcon name={link.icon} size={18} />
            </span>
            <span>
              <strong>{link.title}</strong>
              <small>{link.detail}</small>
            </span>
            <RoleForgeIcon name="arrow" size={16} />
          </Link>
        ))}
      </section>
    </main>
  );
}
