import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/Brand";
import { RoleForgeIcon } from "../components/RoleForgeIcons";
import { ThemeToggle } from "../components/ThemeToggle";
import { safeRedirectPath } from "../lib/safeRedirect";
import { getSupabaseConfig } from "../lib/supabase/config";
import { createRoleForgeServerClient } from "../lib/supabase/server";

type LoginSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function noticeCopy(account: string | undefined) {
  switch (account) {
    case "signin-required":
      return "Sign in to start tailoring resumes and keep saved projects tied to your account.";
    case "check-email":
      return "Check your email for the secure sign-in link.";
    case "signed-out":
      return "You are signed out.";
    case "signin-error":
      return "Sign-in could not finish. Try Google or send a new email link.";
    default:
      return "Use Google or email to continue to the studio.";
  }
}

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const params = await searchParams;
  const next = safeRedirectPath(getParam(params.next) ?? null, "/app");
  const account = getParam(params.account);
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
          <h1 id="login-title" className="display">Sign in to use RoleForge AI</h1>
          <p>{noticeCopy(account)}</p>
          <div className="login-benefits" aria-label="Account benefits">
            <span><RoleForgeIcon name="check" size={14} /> Saved projects stay with your account</span>
            <span><RoleForgeIcon name="lock" size={14} /> The studio is protected from anonymous use</span>
            <span><RoleForgeIcon name="download" size={14} /> PDF exports remain available after runs</span>
          </div>
        </div>

        <div className="login-card">
          {config.configured ? (
            <>
              <a className="studio-oauth-button login-oauth" href={`/auth/oauth?provider=google&next=${encodeURIComponent(next)}`}>
                <span className="studio-oauth-mark" aria-hidden="true">G</span>
                Continue with Google
              </a>
              <div className="studio-account-divider"><span>Email fallback</span></div>
              <form className="studio-account-form" action="/auth/signin" method="post">
                <input type="hidden" name="next" value={next} />
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
                <button className="primary-button studio-account-submit" type="submit">
                  Send sign-in link
                </button>
              </form>
            </>
          ) : (
            <div className="login-disabled">
              <strong>Sign-in is not enabled in this environment.</strong>
              <p>The public site can load, but the protected studio needs account configuration before use.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
