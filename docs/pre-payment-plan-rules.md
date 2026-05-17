# RoleForge AI Pre-Payment Plan Rules

These rules keep the app honest before Stripe is enabled.

## Free plan

- Account required for studio access.
- Resume upload, job target input, AI tailoring, review tabs, saved project sync, restore, and PDF export stay available.
- Saved projects are tied to the signed-in Supabase account.

## Premium placeholder

- DOCX and TXT exports remain locked until billing and exporter support are real.
- Premium templates, higher limits, customer portal, and billing controls remain disabled until Stripe products, prices, webhooks, and entitlement updates are configured.
- The UI may show the current plan state, but must not claim an active paid subscription unless `account_entitlements.plan = 'premium'` and billing state is active/trialing.

## Entitlement source

- `public.account_entitlements` is the account-level source of truth.
- Authenticated users can read only their own entitlement row.
- Users cannot insert or update entitlement rows from the client.
- Future Stripe webhook handlers should update this table with server-side credentials only.
