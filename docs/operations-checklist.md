# RoleForge AI Operations Checklist

Use this when production looks wrong, a deploy fails, or a core workflow breaks. Prefer checks that prove the live system state before changing secrets, OAuth settings, billing config, or deploy settings.

## Live URLs and Repos

- Frontend: `https://roleforgeai.vercel.app`
- Backend: `https://roleforge-api-224015900616.us-central1.run.app`
- Frontend repo: `agrovr/roleforge-ai`
- Backend repo: `agrovr/roleforge-ai-backend`
- Supabase project: `roleforge-ai`
- Backend host: Cloud Run in `us-central1`

## Fast Health Checks

Frontend shell, auth gate, crawler metadata, and security headers:

```bash
cd C:\Users\ashmi\Downloads\Project_v1\resume-tailor-ui-github
node scripts\smoke_frontend.mjs
```

Backend health, readiness, capabilities, and anonymous auth gates:

```bash
cd C:\Users\ashmi\Downloads\Project_v1\resume-tailor-backend
.\.codex-backend-venv\Scripts\python.exe scripts\smoke_backend.py --base-url https://roleforge-api-224015900616.us-central1.run.app --require-auth
```

Backend health with exact deployed revision:

```bash
.\.codex-backend-venv\Scripts\python.exe scripts\smoke_backend.py --base-url https://roleforge-api-224015900616.us-central1.run.app --expect-revision <commit-sha> --require-auth
```

## GitHub Actions

Frontend:

- `Frontend CI` runs tests, lint, typecheck, build, waits for Vercel, then smokes production.
- `Production Smoke` runs daily and can be manually dispatched for the live frontend.
- Optional secret: `ROLEFORGE_SMOKE_COOKIE` for a dedicated smoke account. Do not use a personal browser cookie in CI.

Backend:

- `Deploy Cloud Run` runs tests, deploys to Cloud Run, and smokes the deployed revision.
- `Production Smoke` runs daily and can be manually dispatched for the live backend.
- Optional repository variable: `BACKEND_URL` if the Cloud Run URL changes.
- Optional secret: `SMOKE_AUTH_TOKEN` for a dedicated signed-in smoke user.

Useful checks:

```bash
gh api 'repos/agrovr/roleforge-ai/actions/runs?branch=main&per_page=5' --jq '.workflow_runs | map({name,status,conclusion,head_sha,html_url})'
gh api 'repos/agrovr/roleforge-ai-backend/actions/runs?branch=main&per_page=5' --jq '.workflow_runs | map({name,status,conclusion,head_sha,html_url})'
```

## Deploy Checks

Frontend deploys through Vercel from `agrovr/roleforge-ai` `main`.

Before assuming a frontend bug is fixed in production:

- Confirm GitHub `Frontend CI` passed.
- Confirm the commit has a successful `Vercel` status.
- Run `node scripts\smoke_frontend.mjs`.

Backend deploys through GitHub Actions to Cloud Run from `agrovr/roleforge-ai-backend` `main`.

Before assuming a backend bug is fixed in production:

- Confirm `Deploy Cloud Run` passed.
- Confirm the deploy step and smoke step passed.
- Confirm `/health` reports the expected `revision`.
- Run the backend smoke command with `--expect-revision`.

## Auth and Login

Expected production state:

- The studio at `/app` requires sign-in.
- Landing page should show account-aware navigation when a session exists.
- Supabase email and Google OAuth callbacks return through `/auth/callback`.

Check frontend auth status:

```bash
powershell -Command "Invoke-WebRequest -Uri 'https://roleforgeai.vercel.app/api/auth/status' -UseBasicParsing"
```

Check these when login breaks:

- Vercel public variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Supabase Site URL: `https://roleforgeai.vercel.app`.
- Supabase Redirect URL: `https://roleforgeai.vercel.app/auth/callback`.
- Google OAuth callback URL: `https://ijdspodwpkuhwszmvqip.supabase.co/auth/v1/callback`.
- Fresh magic links after changing Supabase Auth URLs.

Do not put `SUPABASE_SERVICE_ROLE_KEY` into a `NEXT_PUBLIC_*` variable.

## Billing and Plan State

Expected production state:

- Free users get PDF exports and monthly run limits.
- Premium users get premium plan state from `account_entitlements`.
- Billing routes fail closed if entitlement or customer writes cannot be reconciled.

Check these when checkout, portal, or plan state breaks:

- Vercel server-only variables: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PREMIUM_MONTHLY_PRICE_ID`, `STRIPE_PREMIUM_YEARLY_PRICE_ID`.
- Stripe webhook destination: `https://roleforgeai.vercel.app/api/billing/webhook`.
- Stripe webhook events include checkout completion and subscription lifecycle events documented in `docs/stripe-billing-foundation.md`.
- Supabase `account_entitlements` row for the signed-in user.

Useful docs:

- `docs/plan-rules.md`
- `docs/stripe-billing-foundation.md`
- Backend `docs/production-readiness.md`

## Saved Projects

Expected production state:

- Signed-in completed runs sync to Supabase saved projects.
- Local history remains a fallback for browser-only runs.
- Restorable runs reopen the studio from their saved snapshot.

Check these when saved projects look wrong:

- Frontend `/api/saved-runs` routes are reachable for signed-in sessions.
- `SUPABASE_SERVICE_ROLE_KEY` exists in Vercel server-only env.
- Supabase RLS schema from `docs/supabase-account-foundation.sql` is applied.
- A run snapshot exists before expecting restore to work.

## Exports and Downloads

Expected production state:

- PDF is available for the free workflow.
- DOCX and TXT require active premium entitlement.
- Download URLs go through the frontend account-protected route before proxying to the backend.

Check these when downloads fail:

- Backend `/capabilities` advertises upload formats, export formats, and templates.
- Backend `GCS_BUCKET` and `GCS_PREFIX` are set in Cloud Run.
- Backend smoke passes.
- The user still has access to the export format they are trying to download.

## AI Tailoring Failures

If the UI shows a workflow error after the backend AI call:

- Check backend logs for the request id.
- If the model call succeeded but the payload failed, inspect response normalization in backend `services/tailor.py`.
- Keep the Gemini response schema simple; validate non-empty tailored text in Python.
- Do not assume transport, auth, or quota before checking the returned response shape.

## Safe Change Rules

- Preserve working Supabase, Stripe, Google, and Cloud Run secrets unless a rotation is intentional.
- Do not add fake reviews, fake logos, unsupported ATS vendor claims, unsupported stats, or human coach/review claims.
- Do not make premium behavior look active unless entitlement checks and Stripe state are real.
- After frontend changes, run lint, typecheck, tests, build, and production smoke when relevant.
- After backend changes, run pytest and backend smoke. For local Windows temp issues, use a repo-local pytest temp directory.
