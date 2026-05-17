import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { loadAccountEntitlement } from "../lib/entitlements";
import { createRoleForgeServerClient } from "../lib/supabase/server";

type CountResult = { count: number | null; error: unknown };

async function countRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createRoleForgeServerClient>>>,
  table: "resume_projects" | "tailor_runs",
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }) as CountResult;
  return error ? 0 : count ?? 0;
}

export default async function SettingsPage() {
  const supabase = await createRoleForgeServerClient();

  if (!supabase) {
    redirect("/login?next=/settings&account=signin-required");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings&account=signin-required");
  }

  const [projectCount, runCount] = await Promise.all([
    countRows(supabase, "resume_projects"),
    countRows(supabase, "tailor_runs"),
  ]);
  const entitlement = await loadAccountEntitlement(supabase, user.id);
  const planLabel = entitlement.plan === "premium" ? "Premium" : "Free";
  const billingLabel =
    entitlement.billingStatus === "none"
      ? "No billing active"
      : entitlement.billingStatus.replace(/_/g, " ");
  const displayName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

  return (
    <main className="settings-page-shell">
      <header className="settings-page-topbar">
        <Brand href="/" label="RoleForge AI home" />
        <div className="settings-page-actions">
          <Link className="btn btn-soft btn-sm" href="/app">Studio</Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="settings-page-layout">
        <aside className="settings-page-nav" aria-label="Settings sections">
          <a className="active" href="#account"><RoleForgeIcon name="settings" size={15} /> Account</a>
          <a href="#projects"><RoleForgeIcon name="chart" size={15} /> Saved projects</a>
          <a href="#exports"><RoleForgeIcon name="download" size={15} /> Exports</a>
          <a href="#billing"><RoleForgeIcon name="lock" size={15} /> Billing</a>
        </aside>

        <section className="settings-page-main">
          <div className="settings-page-hero">
            <div>
              <div className="eyebrow">Workspace settings</div>
              <h1>Settings</h1>
              <p>Manage your account, saved projects, export access, and plan state.</p>
            </div>
            <span className="settings-status-pill good">{planLabel} plan</span>
          </div>

          <section className="settings-section" id="account">
            <div className="settings-section-copy">
              <h2>Account</h2>
              <p>Your studio access is tied to this signed-in account.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-profile-row">
                <div className="studio-account-button settings-profile-avatar" aria-hidden="true">
                  {(displayName || user.email || "RF").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{displayName || "RoleForge user"}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="settings-metric-row">
                <div className="settings-metric">
                  <strong>{planLabel}</strong>
                  <span>Current plan</span>
                </div>
                <div className="settings-metric">
                  <strong>{billingLabel}</strong>
                  <span>Billing state</span>
                </div>
              </div>
              <form action="/auth/signout" method="post">
                <input type="hidden" name="next" value="/login?account=signed-out" />
                <button className="ghost-button" type="submit">Sign out</button>
              </form>
            </div>
          </section>

          <section className="settings-section" id="projects">
            <div className="settings-section-copy">
              <h2>Saved projects</h2>
              <p>Completed runs are stored with your account and can be restored from History.</p>
            </div>
            <div className="settings-section-panel">
              <div className="settings-metric-row">
                <div className="settings-metric">
                  <strong>{projectCount}</strong>
                  <span>Projects</span>
                </div>
                <div className="settings-metric">
                  <strong>{runCount}</strong>
                  <span>Runs</span>
                </div>
              </div>
              <Link className="btn btn-soft btn-sm settings-inline-link" href="/app#history">Open history</Link>
            </div>
          </section>

          <section className="settings-section" id="exports">
            <div className="settings-section-copy">
              <h2>Exports</h2>
              <p>PDF export is available now. Other formats stay locked until premium is real.</p>
            </div>
            <div className="settings-section-panel settings-export-list">
              <div className="settings-export-item enabled">
                <span><RoleForgeIcon name="check" size={14} />PDF</span>
                <small>{entitlement.exportFormats.pdf ? "Included" : "Unavailable"}</small>
              </div>
              <div className="settings-export-item disabled">
                <span><RoleForgeIcon name="lock" size={14} />DOCX</span>
                <small>{entitlement.exportFormats.docx ? "Entitled, pending exporter" : "Coming soon"}</small>
              </div>
              <div className="settings-export-item disabled">
                <span><RoleForgeIcon name="lock" size={14} />TXT</span>
                <small>{entitlement.exportFormats.txt ? "Entitled, pending exporter" : "Coming soon"}</small>
              </div>
            </div>
          </section>

          <section className="settings-section" id="billing">
            <div className="settings-section-copy">
              <h2>Billing</h2>
              <p>No paid plan is active. Billing controls will appear only after pricing and Stripe entitlements are ready.</p>
            </div>
            <div className="settings-section-panel">
              <span className="settings-status-pill muted">{billingLabel}</span>
              <button className="primary-button settings-coming-soon" type="button" disabled>Coming soon</button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
