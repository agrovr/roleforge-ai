import Link from "next/link";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { TemplateLibrary } from "./TemplateLibrary";

async function getTemplateLinks() {
  const supabase = await createRoleForgeServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const signedIn = Boolean(user);

  return {
    signedIn,
    studioHref: signedIn ? "/app" : "/login?next=/app",
    settingsHref: signedIn ? "/settings#exports" : `/login?next=${encodeURIComponent("/settings#exports")}`,
  };
}

export default async function TemplatesPage() {
  const { signedIn, studioHref, settingsHref } = await getTemplateLinks();

  return (
    <main className="templates-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href={studioHref}>Studio</Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="templates-page-hero" aria-labelledby="templates-title">
        <div>
          <div className="eyebrow">Template library</div>
          <h1 id="templates-title">Resume formats for cleaner exports.</h1>
          <p>
            Choose the visual direction RoleForge should carry into new PDF and premium DOCX exports. You can change it before each run.
          </p>
        </div>
        <div className="templates-page-actions">
          <Link className="primary-button" href={studioHref}>
            Open studio <RoleForgeIcon name="arrow" size={14} />
          </Link>
          <Link className="ghost-button" href={settingsHref}>
            Export access
          </Link>
        </div>
      </section>

      <TemplateLibrary signedIn={signedIn} />
    </main>
  );
}
