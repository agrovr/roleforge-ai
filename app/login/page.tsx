import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { ActionSubmitButton } from "../components/ActionSubmitButton";
import { NativeActionForm } from "../components/NativeActionForm";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { loginNoticeCopy, loginNoticeTone } from "../lib/loginNotice";
import { safeRedirectPath } from "../lib/safeRedirect";
import { getSupabaseConfig } from "../lib/supabase/config";
import { createRoleForgeServerClient } from "../lib/supabase/server";

type LoginSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const params = await searchParams;
  const next = safeRedirectPath(getParam(params.next) ?? null, "/app");
  const statusNext = `/login?next=${encodeURIComponent(next)}`;
  const account = getParam(params.account);
  const notice = loginNoticeCopy(account);
  const tone = loginNoticeTone(account);
  const config = getSupabaseConfig();
  const supabase = await createRoleForgeServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(next);
    }
  }

  return (
    <main className="login-shell">
      <header className="login-nav">
        <Brand href="/" label="RoleForge AI home" />
        <div className="login-nav-actions">
          <ThemeToggle />
          <Link className="btn btn-soft btn-sm" href="/">Home</Link>
        </div>
      </header>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-copy">
          <div className="eyebrow">Account required</div>
          <h1 id="login-title" className="display">Sign in to your RoleForge studio.</h1>
          <p>{notice}</p>
          <div className="login-benefits" aria-label="Account benefits">
            <span><RoleForgeIcon name="check" size={14} /> <span className="login-benefit-copy">Saved projects stay with your account</span></span>
            <span><RoleForgeIcon name="lock" size={14} /> <span className="login-benefit-copy">The studio is protected from anonymous use</span></span>
            <span><RoleForgeIcon name="download" size={14} /> <span className="login-benefit-copy">PDF exports remain available after runs</span></span>
          </div>
          <div className="login-studio-preview" aria-label="Protected studio preview">
            <div className="login-preview-top">
              <span>Protected workspace</span>
              <strong>Resume studio</strong>
            </div>
            <div className="login-preview-sheet">
              <div>
                <span>Resume</span>
                <strong>Selected</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>Ready</strong>
              </div>
              <div>
                <span>Projects</span>
                <strong>Saved</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="login-card">
          {config.configured ? (
            <>
              <div className="login-card-head">
                <span className={`login-status ${tone}`}>{notice}</span>
                <h2>Choose your sign-in method</h2>
                <p>Use Google for the fastest path, or send a secure email link to continue.</p>
              </div>
              <div className="login-session-strip" aria-label="Protected account access">
                <span><RoleForgeIcon name="lock" size={13} /> Protected studio</span>
                <span><RoleForgeIcon name="chart" size={13} /> Saved projects</span>
              </div>
              <a className="studio-oauth-button login-oauth" href={`/auth/oauth?provider=google&next=${encodeURIComponent(next)}`}>
                <span className="studio-oauth-mark" aria-hidden="true">G</span>
                Continue with Google
              </a>
              <div className="studio-account-divider"><span>Email sign-in</span></div>
              <NativeActionForm className="studio-account-form" action="/auth/signin">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="statusNext" value={statusNext} />
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
                <ActionSubmitButton
                  className="primary-button studio-account-submit"
                  label="Send sign-in link"
                  pendingLabel="Sending secure link…"
                />
              </NativeActionForm>
            </>
          ) : (
            <div className="login-disabled">
              <strong>Sign-in is temporarily unavailable.</strong>
              <p>The public site is available. Please try opening the protected studio again shortly.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
