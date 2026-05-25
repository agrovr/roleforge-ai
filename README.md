# RoleForge AI Frontend

Production frontend for RoleForge AI, an AI-assisted resume workflow for uploading a resume, targeting a role, reviewing generated guidance, and exporting a cleaner draft.

- Live app: https://roleforgeai.vercel.app/
- Frontend repo: https://github.com/agrovr/roleforge-ai
- Production backend: `https://roleforge-api-224015900616.us-central1.run.app`
- Private backend repo: `agrovr/roleforge-ai-backend`

The public-facing copy intentionally avoids unsupported customer proof, performance statistics, third-party logos, vendor-specific ATS claims, and human-review claims until those are legally approved and backed by real product behavior.

## Features

- RoleForge AI landing page and resume studio UI
- DOCX, PDF, and TXT resume upload support through the backend
- Job description text or public URL targeting
- Optional company URL context
- Fit, gap, formatting, generated resume, cover letter, interview prep, change log, warning, and local history views when returned by the backend
- PDF export for the free workflow, with DOCX and TXT export access gated by premium entitlement
- Supabase Google OAuth and email magic-link sign-in for protected studio access
- Saved project sync, restore, rename, delete, and account/local history states
- Stripe checkout, customer portal, webhook, and entitlement-backed premium plan state
- Light and dark visual themes

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- CSS / global styling

## Project Structure

```text
app/
  api/auth/status/route.ts        # Safe account readiness endpoint
  app/page.tsx                    # Studio workflow UI
  components/Brand.tsx            # RoleForge brand component
  components/ResumePreview.tsx    # Safe generic resume preview mockups
  components/RoleForgeIcons.tsx   # Inline UI icon set
  lib/supabase/                   # Supabase-ready browser config
  page.tsx                        # Landing page
  globals.css                     # Global styles and responsive layout
  layout.tsx                      # Root layout and metadata
docs/
  operations-checklist.md        # Production checks and break/fix runbook
  supabase-account-foundation.sql # Draft RLS schema for saved projects
  plan-rules.md                   # Current free and premium entitlement rules
  stripe-billing-foundation.md    # Stripe checkout, portal, webhook, and entitlement behavior
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Backend Connection

Configure the public backend URL in local and deployed environments:

```env
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

For production, Vercel should point to:

```env
NEXT_PUBLIC_BACKEND_URL=https://roleforge-api-224015900616.us-central1.run.app
```

The studio expects the backend to provide:

- `GET /health`
- `GET /ready`
- `GET /capabilities`
- `POST /upload`
- `POST /tailor`
- `POST /export`
- `GET /download/{filename}`
- `HEAD /download/{filename}`

## Auth, Account, and Billing

The studio is protected behind Supabase Auth. Email magic-link sign-in and Google OAuth are wired through Supabase Auth, and completed runs can sync into account-backed saved projects when the user is signed in. Saved runs can restore the studio state when they include a snapshot.

Plan rules live in `docs/plan-rules.md`, and Stripe billing behavior lives in `docs/stripe-billing-foundation.md`. The app uses `account_entitlements` as the account-level source of truth so signed-in users can read their current plan while client-side writes remain blocked.

Billing routes fail closed when account entitlement reads or customer writes are unavailable, returning users to Settings instead of continuing with paid state that cannot be reconciled to their Supabase account.

The Supabase-ready frontend foundation is in place:

- `GET /api/auth/status` reports whether public Supabase environment variables are configured and whether a user session exists.
- `GET /auth/oauth?provider=google` starts Google OAuth when the Google provider is configured in Supabase.
- `POST /auth/signin` sends an email magic-link sign-in request.
- `GET /auth/callback` exchanges the Supabase callback code for a session.
- `POST /auth/signout` clears the current session.
- `proxy.ts` refreshes the Supabase SSR session cookies for app routes.
- `app/lib/supabase/client.ts` creates a browser client only when config exists.
- `docs/supabase-account-foundation.sql` defines the RLS-backed profile, entitlement, project, and run-history schema applied to the `roleforge-ai` Supabase project.

Add these public environment variables in Vercel:

```env
NEXT_PUBLIC_SITE_URL=https://roleforgeai.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ijdspodwpkuhwszmvqip.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add a Supabase `service_role` key or secret key to any `NEXT_PUBLIC_*` variable.

In the Supabase dashboard, configure Auth URLs before testing production email links:

- Site URL: `https://roleforgeai.vercel.app`
- Redirect URL: `https://roleforgeai.vercel.app/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`

For email magic links, confirm the email template uses Supabase's confirmation link token that respects the request `redirectTo` value. Old links can expire or keep pointing at an older Site URL, so generate a fresh link after changing Auth URL settings.

For Google OAuth, enable the Google provider in Supabase and use this provider callback URL in the Google Cloud OAuth client:

```text
https://ijdspodwpkuhwszmvqip.supabase.co/auth/v1/callback
```

Server-only production variables required for billing and account writes:

```env
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
STRIPE_PREMIUM_YEARLY_PRICE_ID=
```

Do not expose these values through `NEXT_PUBLIC_*` variables.

## Production Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:frontend
```

`npm run smoke:frontend` checks the live RoleForge shell, login copy, and anonymous `/app` auth gate against `https://roleforgeai.vercel.app` by default. Set `ROLEFORGE_SITE_URL` to target another deployment. Set `ROLEFORGE_SMOKE_COOKIE` only for a dedicated smoke account when you want it to also verify signed-in account status, the studio shell, and settings plan details; do not use a personal browser cookie in CI.

On GitHub Actions, the frontend CI waits for the Vercel status on the pushed commit before running the production smoke check.

Before changing billing behavior, confirm the Stripe products, price IDs, webhook events, redirect URLs, backend endpoints, and entitlement rules match the current production setup.

Use `docs/operations-checklist.md` for the cross-system production runbook covering frontend smoke, backend smoke, auth, billing, saved projects, exports, and AI tailoring failure checks.
