import Link from "next/link";

import { Brand } from "./Brand";
import { RoleForgeIcon } from "./RoleForgeIcons";
import { ThemeToggle } from "./ThemeToggle";

type LegalSection = {
  title: string;
  body: readonly string[];
};

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly LegalSection[];
}) {
  const currentYear = new Date().getFullYear();
  const sectionLinks = sections.map((section, index) => ({
    id: sectionId(section.title),
    index: String(index + 1).padStart(2, "0"),
    title: section.title,
  }));

  return (
    <main className="legal-shell">
      <header className="settings-page-topbar legal-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="legal-hero" aria-labelledby="legal-title">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 id="legal-title" className="display">{title}</h1>
          <p>{intro}</p>
          <div className="legal-hero-meta" aria-label="Policy page notes">
            <span>Plain language</span>
            <span>Current product behavior</span>
            <span>Account controls in Settings</span>
          </div>
        </div>
        <div className="legal-hero-card" aria-label="Policy summary">
          <RoleForgeIcon name="lock" size={18} />
          <span>Account required for the studio</span>
          <span>Resume files are handled for the workflow you request</span>
          <span>Billing is managed through Stripe when Premium is open</span>
        </div>
      </section>

      <section className="legal-summary-strip" aria-label="Policy reading guide">
        <div>
          <span className="eyebrow">Plain-language summary</span>
          <strong>Designed to be readable before you use the app.</strong>
        </div>
        <p>
          These pages summarize current product behavior. Settings contains the live account controls for exports, billing, privacy, and account deletion.
        </p>
      </section>

      <nav className="legal-index" aria-label={`${title} contents`}>
        <div className="legal-index-head">
          <span className="eyebrow">Document map</span>
          <strong>{sectionLinks.length} sections</strong>
          <small>Jump to the part you want to review.</small>
        </div>
        <ol>
          {sectionLinks.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                <span>{section.index}</span>
                <strong>{section.title}</strong>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="legal-grid" aria-label={`${title} sections`}>
        {sections.map((section) => (
          <article className="legal-card" id={sectionId(section.title)} key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </section>

      <section className="legal-footer-card" aria-label="Policy footer">
        <div>
          <span className="eyebrow">Policy center</span>
          <strong>Current public terms and privacy guidance.</strong>
          <small>&copy; {currentYear} RoleForge AI. All rights reserved.</small>
        </div>
        <div className="legal-footer-actions">
          <Link className="btn btn-soft btn-sm" href="/status">Status</Link>
          <Link className="btn btn-soft btn-sm" href="/support">Support</Link>
          <Link className="btn btn-soft btn-sm" href="/updates">Updates</Link>
          <Link className="btn btn-soft btn-sm" href="/help">Help</Link>
          <Link className="btn btn-soft btn-sm" href="/privacy">Privacy</Link>
          <Link className="btn btn-soft btn-sm" href="/terms">Terms</Link>
        </div>
      </section>
    </main>
  );
}
