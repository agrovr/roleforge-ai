import Link from "next/link";
import { AccountAvatar } from "./components/AccountAvatar";
import { Brand } from "./components/Brand";
import { FaqAccordion } from "./components/FaqAccordion";
import { ResumePreview } from "./components/ResumePreview";
import { RoleForgeIcon } from "./components/RoleForgeIcons";
import { ThemeToggle } from "./components/ThemeToggle";
import { accountAvatarUrl, accountDisplayName } from "./lib/accountUser";
import { billingReadiness } from "./lib/billing/readiness";
import { getStripeBillingConfig, PREMIUM_PRICE } from "./lib/billing/stripe";
import { FREE_ENTITLEMENT, loadAccountEntitlement } from "./lib/entitlements";
import { loadAccountProfile } from "./lib/accountProfile";
import { createRoleForgeServerClient } from "./lib/supabase/server";
import { supportRequestHref } from "./lib/supportRequests";
import { monthlyRunAllowanceLabel } from "./lib/usage";

type LandingLinks = {
  signedIn: boolean;
  premiumActive: boolean;
  premiumEnding: boolean;
  checkoutReady: boolean;
  studioHref: string;
  premiumHref: string;
  accountName: string;
  accountEmail: string;
  accountInitials: string;
  accountImageUrl: string;
  planLabel: string;
  planCaption: string;
  exportLabel: string;
  exportCaption: string;
  billingHref: string;
};

const FREE_RUN_ALLOWANCE = monthlyRunAllowanceLabel(FREE_ENTITLEMENT.monthlyRunLimit);
const PREMIUM_MONTHLY_PRICE = PREMIUM_PRICE.monthly / 100;
const PREMIUM_YEARLY_PRICE = PREMIUM_PRICE.yearly / 100;

async function getLandingLinks(): Promise<LandingLinks> {
  const supabase = await createRoleForgeServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const signedIn = Boolean(user);
  const entitlement = user && supabase ? await loadAccountEntitlement(supabase, user.id) : FREE_ENTITLEMENT;
  const profile = user && supabase ? await loadAccountProfile(supabase, user.id) : null;
  const premiumActive = entitlement.plan === "premium" && ["active", "trialing"].includes(entitlement.billingStatus);
  const billing = billingReadiness(getStripeBillingConfig(), {
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    billingStatus: entitlement.billingStatus,
  });
  const premiumHref = premiumActive || billing.checkoutReady
    ? signedIn ? "/settings#billing" : `/login?next=${encodeURIComponent("/settings#billing")}`
    : signedIn ? "/app" : "/login?next=/app";
  const displayName = user ? accountDisplayName(user, profile?.displayName) : "";
  const accountName = displayName || user?.email || "RoleForge account";
  const accountEmail = user?.email || "Signed in";
  const accountInitials = (displayName || accountEmail || "RF").slice(0, 2).toUpperCase();
  const planLabel = premiumActive ? "Premium" : "Free";
  const planCaption = premiumActive
    ? entitlement.cancelAtPeriodEnd ? "Active until period end" : "Unlimited runs active"
    : billing.checkoutReady ? "PDF export now, Premium available" : "PDF export now";
  const exportLabel = entitlement.exportFormats.docx ? "PDF DOCX TXT" : "PDF";
  const exportCaption = entitlement.exportFormats.docx ? "Premium exports active" : "DOCX and TXT need Premium";

  return {
    signedIn,
    premiumActive,
    premiumEnding: premiumActive && entitlement.cancelAtPeriodEnd,
    checkoutReady: billing.checkoutReady,
    studioHref: signedIn ? "/app" : "/login?next=/app",
    premiumHref,
    accountName,
    accountEmail,
    accountInitials,
    accountImageUrl: accountAvatarUrl(user),
    planLabel,
    planCaption,
    exportLabel,
    exportCaption,
    billingHref: signedIn ? "/settings#billing" : "/login?next=/settings%23billing",
  };
}

function Nav({
  signedIn,
  studioHref,
  accountName,
  accountEmail,
  accountInitials,
  accountImageUrl,
  planLabel,
  planCaption,
  exportLabel,
  exportCaption,
  billingHref,
}: Pick<
  LandingLinks,
  | "signedIn"
  | "studioHref"
  | "accountName"
  | "accountEmail"
  | "accountInitials"
  | "accountImageUrl"
  | "planLabel"
  | "planCaption"
  | "exportLabel"
  | "exportCaption"
  | "billingHref"
>) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary navigation">
          <Link className="nav-link nav-link-secondary" href="/templates">Templates</Link>
          <a className="nav-link nav-link-secondary" href="#how">How it works</a>
          <a className="nav-link nav-link-secondary" href="#features">Features</a>
          <a className="nav-link nav-link-secondary" href="#pricing">Pricing</a>
          <span className="nav-divider" aria-hidden="true" />
          <ThemeToggle />
          {signedIn ? (
            <details className="landing-account-menu" data-account-menu="true">
              <summary className="studio-account-button landing-account-button" aria-label="Open account menu">
                <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
              </summary>
              <div className="studio-account-popover landing-account-popover" role="group" aria-label="Account menu">
                <div className="studio-account-popover-head">
                  <span>Account</span>
                </div>
                <div className="studio-account-identity">
                  <div className="studio-account-avatar" aria-hidden="true">
                    <AccountAvatar initials={accountInitials} imageUrl={accountImageUrl} />
                  </div>
                  <div>
                    <strong className="studio-account-email" title={accountEmail}>{accountName}</strong>
                    <span>{accountEmail}</span>
                  </div>
                </div>
                <div className="studio-account-insights landing-account-insights" aria-label="Landing account summary">
                  <Link href={billingHref}>
                    <strong>{planLabel}</strong>
                    <span>{planCaption}</span>
                  </Link>
                  <Link href="/settings#exports">
                    <strong>{exportLabel}</strong>
                    <span>{exportCaption}</span>
                  </Link>
                  <Link href="/status">
                    <strong>Status</strong>
                    <span>Live readiness</span>
                  </Link>
                </div>
                <div className="studio-account-shortcuts landing-account-shortcuts">
                  <Link href="/app"><RoleForgeIcon name="file" size={14} /> Studio</Link>
                  <Link href="/templates"><RoleForgeIcon name="layers" size={14} /> Templates</Link>
                  <Link href="/settings"><RoleForgeIcon name="settings" size={14} /> Settings</Link>
                  <Link href="/settings#billing"><RoleForgeIcon name="lock" size={14} /> Billing</Link>
                  <Link href="/help"><RoleForgeIcon name="mail" size={14} /> Help</Link>
                  <Link href="/support"><RoleForgeIcon name="mail" size={14} /> Support</Link>
                  <Link href="/updates"><RoleForgeIcon name="sparkle" size={14} /> Updates</Link>
                  <Link href="/status"><RoleForgeIcon name="scan" size={14} /> System status</Link>
                </div>
                <div className="studio-account-utilities landing-account-utilities" aria-label="Account utilities">
                  <a href="/api/account/export">
                    <RoleForgeIcon name="download" size={14} /> Export account record
                  </a>
                  <Link href="/settings#security">
                    <RoleForgeIcon name="lock" size={14} /> Security
                  </Link>
                  <Link href="/settings#preferences">
                    <RoleForgeIcon name="layers" size={14} /> Preferences
                  </Link>
                  <Link href="/settings#support">
                    <RoleForgeIcon name="mail" size={14} /> Support history
                  </Link>
                  <Link href="/support">
                    <RoleForgeIcon name="mail" size={14} /> Contact support
                  </Link>
                </div>
                <form className="studio-account-form" action="/auth/signout" method="post">
                  <input type="hidden" name="next" value="/login?account=signed-out" />
                  <button className="ghost-button studio-account-submit" type="submit">Sign out</button>
                </form>
              </div>
            </details>
          ) : (
            <Link className="nav-link nav-link-account" href={studioHref}>Sign in</Link>
          )}
          <Link className="btn btn-brand" href={studioHref}>
            <span className="nav-cta-full">Build my resume</span>
            <span className="nav-cta-short">Build</span>
            <RoleForgeIcon name="arrow" size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero({ studioHref }: Pick<LandingLinks, "studioHref">) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-trust">
          <span className="badge">New</span>
          <span>AI-assisted resume tailoring for focused applications</span>
        </div>
        <h1 className="display h1">
          <span className="hero-line">The resume that</span><br />
          <span className="italic underline-brand">actually fits</span>{" "}<br />
          <span className="hero-line">the role.</span>
        </h1>
        <p className="hero-sub">
          Upload your resume, add a job target, review structure and keyword signals, then export a cleaner draft from the same guided workspace.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-brand btn-lg" href={studioHref}>
            Build my resume <RoleForgeIcon name="arrow" size={14} />
          </Link>
          <a className="btn btn-ghost btn-lg" href="#how">See how it works</a>
        </div>
        <div className="hero-meta safe-meta" aria-label="Product capabilities">
          <div className="hero-meta-item"><span className="v">Upload</span><span className="l">Start from DOCX, PDF, or TXT.</span></div>
          <div className="hero-meta-item"><span className="v">Target</span><span className="l">Use text or URL.</span></div>
          <div className="hero-meta-item"><span className="v">Review</span><span className="l">Check before export.</span></div>
        </div>
      </div>

      <div className="hero-stage" aria-label="RoleForge resume preview">
        <div className="resume-card resume-card-back-l">
          <ResumePreview variant="modern" name="Marcus Reed" role="Software Engineer" />
        </div>
        <div className="resume-card resume-card-front">
          <ResumePreview variant="classic" highlight />
        </div>
        <div className="resume-card resume-card-back-r">
          <ResumePreview variant="accent" name="Priya Patel" role="Product Designer" />
        </div>

        <div className="hero-badge b-score">
          <div className="b-icon"><RoleForgeIcon name="check" size={16} /></div>
          <div>
            <div>Structure review</div>
            <div className="b-meta">Common formatting signals</div>
          </div>
        </div>
        <div className="hero-badge b-keyword">
          <div className="b-icon"><RoleForgeIcon name="sparkle" size={16} /></div>
          <div>
            <div>Keyword guidance</div>
            <div className="b-meta">Matched and missing terms</div>
          </div>
        </div>
        <div className="hero-badge b-ats">
          <div className="b-icon"><RoleForgeIcon name="scan" size={16} /></div>
          <div>
            <div>Export workflow</div>
            <div className="b-meta">Review before download</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleStrip() {
  return (
    <section className="logos" aria-label="RoleForge focus areas">
      <div className="logos-inner">
        <div className="logos-label">Built for focused applications across roles</div>
        <div className="logos-row">
          <span className="l-bold">Product</span>
          <span>Operations</span>
          <span className="l-mono">Engineering</span>
          <span>Design</span>
          <span className="l-bold">Analytics</span>
          <span>Support</span>
          <span className="l-mono">Leadership</span>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    ["upload", "Upload your resume", "Drop in a DOCX, PDF, or TXT resume. RoleForge reads the current structure, headings, and content before generating changes."],
    ["target", "Paste the job", "Drop in the role description or use a public posting URL, then add optional company context when useful."],
    ["sparkle", "Review & tailor", "See fit signals, missing terms, formatting notes, and generated changes in a single review flow."],
    ["download", "Export & apply", "Download a clean PDF after the generated result and notes look ready for your own review."],
  ] as const;

  return (
    <section className="section" id="how">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="display h2">Four steps. <span className="italic">One</span> tailored resume.</h2>
          </div>
          <p className="lede">Drop your resume, point at the role, review the suggested changes, and export a cleaner draft from the same workspace.</p>
        </div>
        <div className="steps">
          {steps.map(([icon, title, text], index) => (
            <article className="step" key={title}>
              <div className="step-num">{String(index + 1).padStart(2, "0")}</div>
              <div className="step-icon"><RoleForgeIcon name={icon} size={18} /></div>
              <h4 className="step-title">{title}</h4>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudioPreview({ studioHref }: Pick<LandingLinks, "studioHref">) {
  const navItems = [
    ["doc", "Resume", "Ready"],
    ["target", "Job target", "Set"],
    ["sparkle", "AI tailor", "Review"],
    ["chart", "History", "Saved"],
  ] as const;

  const toolItems = [
    ["scan", "ATS check"],
    ["download", "Export"],
    ["settings", "Settings"],
  ] as const;

  const stats = [
    ["Resume", "Ready", "PDF, DOCX, TXT"],
    ["Target", "Added", "Text or URL"],
    ["Review", "Checked", "Review changes"],
    ["Export", "PDF", "Free export"],
  ] as const;

  const tips = [
    ["sparkle", "Clarify the impact", "Review bullets that could use a stronger outcome, scope, or responsibility signal before export."],
    ["check", "Check target terms", "Compare matched and missing terms against the role so edits stay relevant to the job."],
    ["scan", "Keep parsing simple", "Review common layout risks before sending a draft through an application form."],
  ] as const;

  return (
    <section className="dash-section" id="studio">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">The studio</div>
            <h2 className="display h2">Everything you need.{" "}<br /><span className="italic">Nothing</span> you don&apos;t.</h2>
          </div>
          <p className="lede">A focused workspace that shows your resume, the job, and generated suggestions side-by-side. Fit signals, gaps, and export controls stay in one calm panel.</p>
        </div>
        <div className="dash-mock">
          <div className="dash-mock-head">
            <div className="dash-traffic"><span /><span /><span /></div>
            <div className="dash-mock-url">roleforgeai.vercel.app/app</div>
          </div>
          <div className="dash-mock-body">
            <aside className="dash-side">
              <div className="dash-side-label">Workspace</div>
              {navItems.map(([icon, label, meta], index) => (
                <div className={`dash-side-item ${index === 0 ? "active" : ""}`} key={label}>
                  <RoleForgeIcon name={icon} size={15} />
                  <span>{label}</span>
                  {meta ? <span className="dash-pill">{meta}</span> : null}
                </div>
              ))}
              <div className="dash-side-divider" />
              <div className="dash-side-label">Tools</div>
              {toolItems.map(([icon, label]) => (
                <div className="dash-side-item" key={label}>
                  <RoleForgeIcon name={icon} size={15} />
                  <span>{label}</span>
                </div>
              ))}
            </aside>
            <div className="dash-main">
              <div className="dash-main-head">
                <div>
                  <h3>Resume studio</h3>
                  <p>Current run · saved project ready</p>
                </div>
                <Link className="btn btn-brand btn-sm" href={studioHref}><RoleForgeIcon name="plus" size={14} />New resume</Link>
              </div>
              <div className="dash-stats">
                {stats.map(([label, value, delta]) => (
                  <div className="dash-stat" key={label}>
                    <div className="dash-stat-label">{label}</div>
                    <div className="dash-stat-value">{value}</div>
                    <div className="dash-stat-delta">{delta}</div>
                  </div>
                ))}
              </div>
              <div className="dash-resume-card">
                <div className="dash-resume-thumb"><ResumePreview highlight /></div>
                <div className="dash-resume-info">
                  <div>
                    <h4 className="dash-resume-title">Role-targeted resume draft</h4>
                    <div className="dash-resume-meta">
                      <span>Sample preview</span><span>·</span><span>PDF export</span><span>·</span><span>Review before sending</span>
                    </div>
                    <div className="dash-progress">
                      <div className="dash-progress-row"><span>Workflow status</span><span>Ready</span></div>
                      <div className="dash-progress-track"><span /></div>
                    </div>
                  </div>
                  <div className="dash-resume-actions">
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="edit" size={13} />Edit</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="download" size={13} />Download</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="copy" size={13} />Duplicate</span>
                    <span className="btn btn-soft btn-sm"><RoleForgeIcon name="chart" size={13} />Fit signals</span>
                  </div>
                </div>
              </div>
            </div>
            <aside className="dash-aside">
              <div>
                <div className="eyebrow">AI guidance</div>
                <h4>Review notes</h4>
                <p>Generated suggestions stay tied to the resume and target in the active run.</p>
              </div>
              {tips.map(([icon, title, text]) => (
                <div className="dash-aside-tip" key={title}>
                  <div className="dash-aside-tip-head"><RoleForgeIcon name={icon} size={12} />{title}</div>
                  <p>{text}</p>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function Templates() {
  const templates = [
    ["Classic", "General roles", "classic", "#f5e6cb"],
    ["Modern", "Technical resumes", "modern", "#d8e0ee"],
    ["Editorial", "Creative roles", "accent", "#d9e7df"],
    ["Compact", "Concise drafts", "classic", "#efd8d1"],
    ["Executive", "Senior roles", "accent", "#f0dfbd"],
    ["Engineer", "Technical roles", "modern", "#d8e0ee"],
  ] as const;

  return (
    <section className="templates" id="templates">
      <div className="templates-head">
        <div className="section-head">
          <div>
            <div className="eyebrow">Templates</div>
              <h2 className="display h2">Resume formats.{" "}<br /><span className="italic">Beautifully</span> simple.</h2>
          </div>
          <p className="lede">Browse the visual directions RoleForge can carry into cleaner resume exports. Pick a direction before opening the studio.</p>
        </div>
      </div>
      <div className="templates-row">
        {templates.map(([name, tag, variant, color], index) => (
          <article className="template-card" key={name}>
            <div className="template-thumb" style={{ borderTopColor: color }}>
              <ResumePreview variant={variant} name={["Sarah Chen", "Marcus Reed", "Priya Patel", "Alex Kim", "Daniel Cole", "Jen Park"][index]} />
            </div>
            <div className="template-info">
              <span className="template-name">{name}</span>
              <span className="template-tag">{tag}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="templates-actions">
        <Link className="btn btn-ghost btn-lg" href="/templates">Open template workspace</Link>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    [
      "sparkle",
      "",
      "AI tailoring",
      "Generate role-targeted suggestions from your resume and target role, then review every change before export.",
      ["Side-by-side review flow", "Conservative, balanced, and stronger modes", "Keeps your source details visible"],
    ],
    [
      "scan",
      "accent",
      "ATS-friendly review",
      "Check common parser risks before you send a draft, without claiming a guaranteed pass.",
      ["Heading and section sanity", "Bullet, table, and column notes", "Contact formatting checks"],
    ],
    [
      "chart",
      "coral",
      "Fit signals",
      "See how the target role reads against your resume and which terms may need review.",
      ["Matched and missing terms", "Role-focused summary notes", "Review-ready improvement signals"],
    ],
    [
      "mail",
      "sky",
      "Cover letters",
      "Generate a matching draft from the same resume and target brief when the run completes.",
      ["Same role context", "Review before sending", "Editable generated text"],
    ],
    [
      "briefcase",
      "",
      "Interview prep",
      "Use generated prep notes to rehearse from the same role and resume context.",
      ["Role-specific question prompts", "Evidence from your resume", "Notes stay tied to the run"],
    ],
    [
      "layers",
      "accent",
      "Saved projects",
      "Keep completed tailoring runs tied to your account so useful drafts can be reopened later.",
      ["Account sync", "History restore", "Saved export links"],
    ],
  ] as const;

  return (
    <section className="section" id="features">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">Features</div>
            <h2 className="display h2">More than a builder.{" "}<br /><span className="italic">A guided workspace.</span></h2>
          </div>
          <p className="lede">RoleForge compares the target role with your resume and shows practical next steps without rewriting your career.</p>
        </div>
        <div className="features-grid">
          {features.map(([icon, tone, title, text, bullets]) => (
            <article className="feature-card" key={title}>
              <div className={`feature-icon${tone ? ` ${tone}` : ""}`}><RoleForgeIcon name={icon} size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <ul className="feature-card-list">
                {bullets.map((bullet) => (
                  <li key={bullet}><span className="feature-check" aria-hidden="true">✓</span><span>{bullet}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({
  studioHref,
  premiumHref,
  signedIn,
  premiumActive,
  premiumEnding,
  checkoutReady,
}: Pick<LandingLinks, "studioHref" | "premiumHref" | "signedIn" | "premiumActive" | "premiumEnding" | "checkoutReady">) {
  const freeStatus = signedIn && !premiumActive ? "Current plan" : "Starter plan";
  const premiumPaused = !premiumActive && !checkoutReady;
  const premiumStatus = premiumActive ? (premiumEnding ? "Active until period end" : "Current plan") : premiumPaused ? "Paused" : "Upgrade";
  const premiumCta = premiumActive ? "Manage Premium" : premiumPaused ? "Use free studio" : signedIn ? "View plans" : "Sign in to upgrade";
  const freeStatusTone = signedIn && !premiumActive ? "current" : "starter";
  const premiumStatusTone = premiumActive ? "current" : premiumPaused ? "paused" : "upgrade";
  const billingHref = signedIn ? "/settings#billing" : "/login?next=/settings%23billing";
  const billingSupportHref = supportRequestHref({
    category: "billing",
    subject: "Billing or Premium access",
    contextUrl: "/#pricing",
  });

  return (
    <section className="section" id="pricing">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">Pricing</div>
            <h2 className="display h2">Start lean, upgrade when you need more room.</h2>
          </div>
          <p className="lede">
            {checkoutReady || premiumActive
              ? "Free covers the core PDF workflow with a monthly run limit. Premium is available for early users who need more exports and runs."
              : "Free covers the core PDF workflow with a monthly run limit. Premium details stay visible while checkout is unavailable."}
          </p>
        </div>
        <div className="pricing-grid two">
          <article className="price-card">
            <div className="price-card-top">
              <div className="price-name">Studio</div>
              <span className={`price-status ${freeStatusTone}`}>{freeStatus}</span>
            </div>
            <div className="price-amount"><span className="v">$0</span></div>
            <div className="price-desc">Start with {FREE_RUN_ALLOWANCE} for upload, targeting, review, and PDF export.</div>
            <ul className="price-list">
              <li><RoleForgeIcon name="check" size={14} />{FREE_RUN_ALLOWANCE}</li>
              <li><RoleForgeIcon name="check" size={14} />DOCX, PDF, and TXT upload</li>
              <li><RoleForgeIcon name="check" size={14} />PDF export</li>
              <li><RoleForgeIcon name="check" size={14} />Saved project sync and restore</li>
              <li><RoleForgeIcon name="check" size={14} />Job description or public URL targeting</li>
            </ul>
            <Link className="btn btn-soft btn-lg" href={studioHref}>Open studio</Link>
          </article>
          <article className="price-card featured">
            <div className="price-card-top">
              <div className="price-name">Premium</div>
              <span className={`price-status ${premiumStatusTone}`}>{premiumStatus}</span>
            </div>
            <div className="price-amount"><span className="v">${PREMIUM_MONTHLY_PRICE}</span><span className="m">/mo</span></div>
            <div className="price-desc">
              {premiumActive
                ? "Your account has unlimited runs plus PDF, DOCX, and TXT exports in the studio."
                : premiumPaused
                  ? "Premium checkout is currently unavailable. The free signed-in studio remains open with PDF export."
                : `$${PREMIUM_YEARLY_PRICE}/year for early users. Premium unlocks unlimited runs plus DOCX and TXT exports.`}
            </div>
            <ul className="price-list">
              <li><RoleForgeIcon name="check" size={14} />Unlimited tailoring runs</li>
              <li><RoleForgeIcon name="check" size={14} />DOCX and TXT exports</li>
              <li><RoleForgeIcon name="check" size={14} />No monthly run cap</li>
            </ul>
            <Link className="btn btn-brand btn-lg" href={premiumHref}>{premiumCta}</Link>
          </article>
        </div>
        <div className="pricing-clarity-grid" aria-label="Billing clarity">
          <Link href={billingHref}>
            <span><RoleForgeIcon name="settings" size={15} /></span>
            <strong>Manage in Settings</strong>
            <small>Stripe billing opens from Settings for invoices, payment methods, and plan changes.</small>
          </Link>
          <Link href={billingHref}>
            <span><RoleForgeIcon name="lock" size={15} /></span>
            <strong>Cancel through billing</strong>
            <small>When a subscription is canceled, Premium access stays active through the paid period.</small>
          </Link>
          <Link href={billingSupportHref}>
            <span><RoleForgeIcon name="mail" size={15} /></span>
            <strong>Billing support</strong>
            <small>Open a support request with billing context attached when checkout or access needs help.</small>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FAQ({ checkoutReady }: Pick<LandingLinks, "checkoutReady">) {
  const items = [
    ["Does RoleForge replace my judgment?", "No. The app surfaces generated guidance and exports a draft for your review."],
    ["Can I use a job posting URL?", "Yes, if the posting is public and RoleForge can access it. Pasted text is the most reliable target input."],
    ["What file formats can I export?", "The free workflow exports PDF. Premium enables DOCX and TXT exports when your plan is active."],
    ["Can I use templates?", "Yes. Pick a template direction before opening the studio, and RoleForge sends that direction with new exports."],
    ["Is sign-in available?", "Yes. Google and email magic-link sign-in are available. Saved projects sync after sign-in."],
    ["Can I cancel Premium?", "Yes. Manage billing opens Stripe from Settings for plan changes and cancellation. If you cancel during a paid period, Premium access remains active until that period ends."],
    ["How much is Premium?", checkoutReady
      ? `The launch price is $${PREMIUM_MONTHLY_PRICE}/month or $${PREMIUM_YEARLY_PRICE}/year. Billing management is handled by Stripe.`
      : `The launch price is $${PREMIUM_MONTHLY_PRICE}/month or $${PREMIUM_YEARLY_PRICE}/year. Premium checkout is currently unavailable while the free studio stays open.`],
  ] as const;

  return (
    <section className="section section-alt" id="faq">
      <div className="section-inner">
        <div className="section-head">
          <div>
            <div className="eyebrow">FAQ</div>
            <h2 className="display h2">Clear answers for this launch.</h2>
          </div>
          <p className="lede">Straight answers about what RoleForge does today, what stays gated, and how billing works.</p>
        </div>
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}

function CTABand({ studioHref }: Pick<LandingLinks, "studioHref">) {
  return (
    <section className="section cta-section" id="final-cta">
      <div className="section-inner">
        <div className="cta-band">
          <div>
            <div className="eyebrow">Ready when you are</div>
            <h2>Stop tailoring by hand. <em>Start</em> applying with clarity.</h2>
            <p>Free to start. No credit card required. Upload your resume, target the role, and review a cleaner draft.</p>
            <div className="cta-cluster">
              <Link className="btn btn-brand btn-lg" href={studioHref}>Build my resume <RoleForgeIcon name="arrow" size={14} /></Link>
              <Link className="btn btn-ghost btn-lg" href="/templates">Browse templates</Link>
            </div>
          </div>
          <div className="cta-visual">
            <div className="resume-card back"><ResumePreview variant="modern" name="Marcus Reed" role="Software Engineer" /></div>
            <div className="resume-card"><ResumePreview variant="classic" highlight /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p className="footer-tag">The AI-assisted resume studio for clearer role targeting and cleaner exports.</p>
        </div>
        <div className="footer-col">
          <h3>Product</h3>
          <a href="#features">Tailoring</a>
          <a href="#features">Formatting review</a>
          <Link href="/templates">Templates</Link>
        </div>
        <div className="footer-col">
          <h3>Available now</h3>
          <span>Protected studio access</span>
          <span>Saved project history</span>
          <span>Settings and account controls</span>
        </div>
        <div className="footer-col">
          <h3>Trust</h3>
          <Link href="/help">Help</Link>
          <Link href="/support">Support</Link>
          <Link href="/status">Status</Link>
          <Link href="/updates">Updates</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
      <div className="footer-meta">
        <span>RoleForge AI</span>
        <span>Focused resume tailoring for real applications.</span>
      </div>
    </footer>
  );
}

export default async function Landing() {
  const links = await getLandingLinks();

  return (
    <main className="page-shell">
      <Nav
        signedIn={links.signedIn}
        studioHref={links.studioHref}
        accountName={links.accountName}
        accountEmail={links.accountEmail}
        accountInitials={links.accountInitials}
        accountImageUrl={links.accountImageUrl}
        planLabel={links.planLabel}
        planCaption={links.planCaption}
        exportLabel={links.exportLabel}
        exportCaption={links.exportCaption}
        billingHref={links.billingHref}
      />
      <Hero studioHref={links.studioHref} />
      <RoleStrip />
      <HowItWorks />
      <StudioPreview studioHref={links.studioHref} />
      <Templates />
      <Features />
      <Pricing
        signedIn={links.signedIn}
        studioHref={links.studioHref}
        premiumHref={links.premiumHref}
        premiumActive={links.premiumActive}
        premiumEnding={links.premiumEnding}
        checkoutReady={links.checkoutReady}
      />
      <FAQ checkoutReady={links.checkoutReady} />
      <CTABand studioHref={links.studioHref} />
      <Footer />
    </main>
  );
}
