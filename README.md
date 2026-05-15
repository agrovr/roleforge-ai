# RoleForge AI Frontend

Production frontend for RoleForge AI, an AI-assisted resume workflow for uploading a resume, targeting a role, reviewing generated guidance, and exporting a cleaner draft.

- Live app: https://resume-tailor-ui-eta.vercel.app/
- Frontend repo: https://github.com/agrovr/resume-tailor-ui
- Production backend: `https://roleforge-api-224015900616.us-central1.run.app`
- Private backend repo: `agrovr/roleforge-ai-backend`

The public-facing copy intentionally avoids unsupported customer proof, performance statistics, third-party logos, vendor-specific ATS claims, and human-review claims until those are legally approved and backed by real product behavior.

## Features

- RoleForge AI landing page and resume studio UI
- DOCX, PDF, and TXT resume upload support through the backend
- Job description text or public URL targeting
- Optional company URL context
- Fit, gap, formatting, generated resume, cover letter, interview prep, change log, warning, and local history views when returned by the backend
- PDF export for the launch flow
- Supabase email sign-in foundation for account sessions
- Disabled or coming-soon states for premium billing, account settings, saved projects, and premium feature gating
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
  supabase-account-foundation.sql # Draft RLS schema for saved projects
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

## Auth, Account, and Billing Readiness

The studio includes a visible account menu so the interface has a stable place for sign-in, saved projects, settings, and billing controls. Email magic-link sign-in is wired through Supabase Auth. Saved projects, billing, account settings, and premium entitlements still remain disabled until the product rules and backend storage flows are complete.

The Supabase-ready frontend foundation is in place:

- `GET /api/auth/status` reports whether public Supabase environment variables are configured and whether a user session exists.
- `GET /auth/oauth?provider=google` starts Google OAuth when the Google provider is configured in Supabase.
- `POST /auth/signin` sends an email magic-link sign-in request.
- `GET /auth/callback` exchanges the Supabase callback code for a session.
- `POST /auth/signout` clears the current session.
- `proxy.ts` refreshes the Supabase SSR session cookies for app routes.
- `app/lib/supabase/client.ts` creates a browser client only when config exists.
- `docs/supabase-account-foundation.sql` defines the RLS-backed profile, project, and run-history schema applied to the `roleforge-ai` Supabase project.

Add these public environment variables in Vercel:

```env
NEXT_PUBLIC_SITE_URL=https://resume-tailor-ui-eta.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ijdspodwpkuhwszmvqip.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add a Supabase `service_role` key or secret key to any `NEXT_PUBLIC_*` variable.

In the Supabase dashboard, configure Auth URLs before testing production email links:

- Site URL: `https://resume-tailor-ui-eta.vercel.app`
- Redirect URL: `https://resume-tailor-ui-eta.vercel.app/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`

For email magic links, confirm the email template uses Supabase's confirmation link token that respects the request `redirectTo` value. Old links can expire or keep pointing at an older Site URL, so generate a fresh link after changing Auth URL settings.

For Google OAuth, enable the Google provider in Supabase and use this provider callback URL in the Google Cloud OAuth client:

```text
https://ijdspodwpkuhwszmvqip.supabase.co/auth/v1/callback
```

Needed before enabling these areas:

- Stripe products, price IDs, checkout/customer portal endpoints, and entitlement checks
- Plan rules for premium exports, templates, and feature limits
- Saved-project sync rules and UI states

## Production Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Before enabling auth or billing, provide the auth provider, payment provider, Stripe price IDs or billing model, redirect URLs, backend endpoints, and entitlement rules.
