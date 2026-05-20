# RoleForge AI Plan Rules

These rules keep the app honest now that Stripe billing and entitlement state are connected.

## Free plan

- Account required for studio access.
- Resume upload, job target input, AI tailoring, review tabs, saved project sync, restore, and PDF export stay available.
- Saved projects are tied to the signed-in Supabase account.
- Free includes 5 completed tailoring runs per calendar month.

## Premium

- Launch price is `$9/month` or `$72/year` for early users.
- Stripe test-mode product: `prod_UX0qgAJCKf6dwt`.
- Stripe test-mode prices:
  - Monthly: `price_1TXwpIRpyJeACd6qTXDo2gyr`
  - Yearly: `price_1TXwpJRpyJeACd6qp7hWyWIJ`
- DOCX and TXT exports remain locked unless Stripe confirms a subscription and the entitlement row is premium active/trialing.
- Premium has no monthly tailoring run cap at launch.
- Premium templates and other premium-only workflow upgrades remain disabled until their product rules and implementation are real.
- The UI may show the current plan state, but must not claim an active paid subscription unless `account_entitlements.plan = 'premium'` and billing state is active/trialing.

## Entitlement source

- `public.account_entitlements` is the account-level source of truth.
- Authenticated users can read only their own entitlement row.
- Users cannot insert or update entitlement rows from the client.
- Stripe webhook handlers update this table with server-side credentials only.
- Entitlement `features.monthly_run_limit` is `5` for free accounts and `null` for active/trialing premium accounts.

## Billing environment

- `STRIPE_SECRET_KEY`: server-only Stripe key.
- `STRIPE_WEBHOOK_SECRET`: signing secret for `/api/billing/webhook`.
- `STRIPE_PREMIUM_MONTHLY_PRICE_ID`: monthly recurring Price ID.
- `STRIPE_PREMIUM_YEARLY_PRICE_ID`: yearly recurring Price ID.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by checkout and webhook routes to write entitlement rows.
