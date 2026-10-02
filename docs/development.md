# Development and configuration

Everything needed to run the RoleForge frontend locally, connect it to its services, and check a
deployment. For break/fix steps across the whole system, see
[operations-checklist.md](operations-checklist.md).

## Run locally

Needs Node.js 22.

```bash
npm ci
cp .env.example .env.local   # then fill in the blanks
npm run dev                  # http://localhost:3000
```

The landing page, template library and legal pages render without any services. The studio at
`/app` needs Supabase Auth and a reachable backend.

## Environment variables

Public values (safe in the browser):

| Variable | Purpose |
| :-- | :-- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for metadata, sitemap and auth redirects |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL of the FastAPI service, for example `http://127.0.0.1:8000` locally |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (a legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works) |

Server-only values, needed for billing and account writes:

| Variable | Purpose |
| :-- | :-- |
| `SUPABASE_SERVICE_ROLE_KEY` | Writes entitlements and Stripe customer links |
| `STRIPE_SECRET_KEY` | Checkout and billing portal sessions |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` / `STRIPE_PREMIUM_YEARLY_PRICE_ID` | Premium plan prices |

Never put a service-role or secret key in a `NEXT_PUBLIC_*` variable, and never commit `.env.local`
(every `.env*` file except `.env.example` is ignored).

## Backend contract

The studio calls the backend directly from the browser with the user's Supabase access token
(issued by `GET /api/auth/workflow-token`). It expects:

| Method | Path | Used for |
| :-- | :-- | :-- |
| `GET` | `/health`, `/ready` | Liveness, readiness and the public status page |
| `GET` | `/capabilities` | Upload formats, export formats and limits |
| `POST` | `/upload` | Parse a DOCX, PDF or TXT resume |
| `POST` | `/tailor` | Generate the tailored resume, notes, cover letter and interview prep |
| `POST` | `/export` | Render a PDF, DOCX or TXT file in the chosen template |
| `GET` / `HEAD` | `/download/{filename}` | Fetch a rendered export (proxied by `/api/workflow/download/[filename]`) |

## Auth

Supabase Auth handles Google OAuth and email magic links.

| Route | What it does |
| :-- | :-- |
| `GET /api/auth/status` | Reports whether Supabase is configured and whether a session exists |
| `GET /auth/oauth?provider=google` | Starts Google OAuth |
| `POST /auth/signin` | Sends a magic-link email |
| `GET /auth/callback` | Exchanges the callback code for a session |
| `POST /auth/signout` | Clears the session |

`proxy.ts` refreshes the SSR session cookies on app routes.

In the Supabase dashboard, set the Site URL to the deployed origin and add
`<origin>/auth/callback` (plus `http://localhost:3000/auth/callback` for local work) as redirect
URLs. For Google, use `https://<project-ref>.supabase.co/auth/v1/callback` as the OAuth client's
redirect URI. After changing auth URLs, request a fresh magic link; old links keep the old target.

## Accounts, saved projects and billing

- The schema lives in [`supabase/migrations`](../supabase/migrations), with the original draft in
  [supabase-account-foundation.sql](supabase-account-foundation.sql). Every table is behind
  row-level security.
- `account_entitlements` is the source of truth for a user's plan. Signed-in users can read it;
  only the server (service role) can write it.
- Plan limits are in [plan-rules.md](plan-rules.md), and checkout, portal and webhook behavior is in
  [stripe-billing-foundation.md](stripe-billing-foundation.md).
- Billing routes fail closed: if an entitlement read or customer write fails, the user is sent back
  to Settings rather than shown a paid state that can't be reconciled.

## Checks

| Script | What it does |
| :-- | :-- |
| `npm test` | Unit tests for `app/lib` and the operational scripts (Node's test runner via `tsx`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run smoke:frontend` | Live smoke of the shell, auth gates, crawler metadata, billing gates and the backend `/capabilities` contract |
| `npm run smoke:layout` | Renders key pages in headless Chrome at several widths and checks for layout breakage |
| `npm run smoke:readiness` | Checks the GitHub variables and secrets the signed-in smoke needs, and prints the commands to fix gaps (names only, never values) |

`smoke:frontend` targets the production site and backend by default. Point it somewhere else with
`--base-url` and `--backend-url` (or `ROLEFORGE_SITE_URL` / `ROLEFORGE_BACKEND_URL`); a local build
that still emits the production sitemap also needs `--canonical-url`:

```bash
npm run smoke:frontend -- --base-url http://127.0.0.1:3000 --canonical-url https://roleforgeai.vercel.app
```

### Signed-in smoke in CI

On every push to `main`, Frontend CI waits for the Vercel deployment of that commit, then runs the
frontend and layout smokes as a dedicated, non-personal test user. A daily Production Smoke workflow
runs the same checks. They need:

- repository variables `ROLEFORGE_SUPABASE_URL`, `ROLEFORGE_SUPABASE_PUBLISHABLE_KEY` and
  `ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE=true`
- repository secrets `ROLEFORGE_SMOKE_EMAIL` and `ROLEFORGE_SMOKE_PASSWORD`
- optionally `ROLEFORGE_EXPECT_PREMIUM_ACCESS=true`, if the test user should have Premium

The smoke signs in through Supabase, builds the same SSR cookie the app uses, and checks account
status, the studio shell, a saved-project create/rename/delete round trip, export and download
through the backend, and the plan shown in Settings. `ROLEFORGE_SMOKE_COOKIE` still works for
one-off local runs.

Before changing billing, confirm the Stripe products, price IDs, webhook events, redirect URLs and
entitlement rules still match production.

## Updating the README art

The banners, `app/opengraph-image.jpg` and `app/twitter-image.jpg` (the link previews) and the architecture diagram come from
[`docs/brand/brand.html`](brand/brand.html) and [`docs/brand/architecture.html`](brand/architecture.html).
Open them with the query strings listed at the top of each file and screenshot the `#card` element.
The screenshots in `docs/screens/` are taken from a production build in both themes (`?theme=dark`
forces dark mode).
