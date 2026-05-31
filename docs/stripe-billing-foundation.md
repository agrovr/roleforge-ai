# RoleForge AI Stripe Billing

## Launch pricing

- Premium monthly: `$9/month`
- Premium yearly: `$72/year`
- Stripe test product: `prod_UX0qgAJCKf6dwt`
- Stripe test monthly price: `price_1TXwpIRpyJeACd6qTXDo2gyr`
- Stripe test yearly price: `price_1TXwpJRpyJeACd6qp7hWyWIJ`

This price intentionally stays competitive while RoleForge is early.

## Production environment

Configured in Vercel production:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- `STRIPE_PREMIUM_YEARLY_PRICE_ID`

Production checkout and customer portal access only enable when `STRIPE_SECRET_KEY` is a live key (`sk_live_...`). If production is still configured with a test key, the app fails closed and keeps the free signed-in workflow available without sending visitors to Stripe sandbox checkout.

## Turning Premium back on with live Stripe

Premium is ready to be re-enabled when the production Vercel environment uses live-mode Stripe values from the same Stripe account:

1. In Stripe, switch to live mode.
2. Create or confirm the live RoleForge AI Premium product.
3. Create live monthly and yearly recurring Prices for `$9/month` and `$72/year`.
4. Create a live webhook endpoint for `https://roleforgeai.vercel.app/api/billing/webhook` with the events listed below.
5. In Vercel Production, set:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...`
   - `STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...`
   - `SUPABASE_SERVICE_ROLE_KEY=<existing production service role key>`
   - `NEXT_PUBLIC_SITE_URL=https://roleforgeai.vercel.app`
6. Redeploy the frontend from `main`.
7. Run the launch check:

```bash
cd C:\Users\ashmi\Downloads\Project_v1\resume-tailor-ui-github
npm run check:billing -- --strict
```

The check never prints secret values. It exits nonzero if production is still pointed at a test Stripe key or if the billing environment is incomplete.

When Vercel CLI is logged in, check the actual production environment without printing secrets:

```bash
npm run check:billing:vercel
```

To update one live Stripe value from a copied value without printing it, pipe the value into the guarded setter:

```powershell
Get-Clipboard | npm run set:billing:vercel -- STRIPE_SECRET_KEY
Get-Clipboard | npm run set:billing:vercel -- STRIPE_PREMIUM_MONTHLY_PRICE_ID
Get-Clipboard | npm run set:billing:vercel -- STRIPE_PREMIUM_YEARLY_PRICE_ID
Get-Clipboard | npm run set:billing:vercel -- STRIPE_WEBHOOK_SECRET
```

The setter validates the expected prefix (`sk_live_`, `price_`, or `whsec_`) before replacing the Vercel Production value.

## Live checkout smoke

Use this after billing env changes or before a launch announcement:

```powershell
$keysJson = (npx supabase projects api-keys --project-ref ijdspodwpkuhwszmvqip --output json) | Out-String
$env:ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY = (($keysJson | ConvertFrom-Json) | Where-Object { $_.id -eq "service_role" } | Select-Object -First 1).api_key
node scripts\smoke_live_checkout.mjs
Remove-Item Env:\ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY
```

The smoke creates a temporary confirmed Supabase user, submits the signed-in checkout form, verifies the redirect goes to `checkout.stripe.com` with a `cs_live` session id, and deletes the temporary user. It should appear in Stripe as an incomplete live Checkout Session and should not create a charge.

## Stripe webhook endpoint

Create a Stripe webhook endpoint for:

```text
https://roleforgeai.vercel.app/api/billing/webhook
```

Subscribe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.deleted`

After creating the endpoint, add its signing secret to Vercel as `STRIPE_WEBHOOK_SECRET`.

## Entitlement behavior

- Checkout is only available to signed-in users.
- Checkout creates or reuses a Stripe customer and records the customer ID in `account_entitlements` before sending the user to Stripe.
- Checkout stops and returns to `/settings?billing=temporarily-unavailable#billing` if the entitlement lookup fails or the Stripe customer ID cannot be saved.
- Billing portal access stops and returns to `/settings?billing=temporarily-unavailable#billing` if the entitlement lookup fails.
- Premium is only granted by Stripe webhook events.
- Active or trialing subscriptions set `plan = 'premium'`, unlock premium export entitlements, and set `monthly_run_limit = null`. The app also treats active/trialing Premium as unlimited if stale numeric feature data is present.
- Canceled, incomplete, past-due, or missing subscriptions fall back to free entitlements.
- Free entitlement keeps PDF export available and sets `monthly_run_limit = 5`.

## Operational checks

- Keep all Stripe and Supabase service credentials server-only.
- After changing Price IDs or webhook events, redeploy and confirm checkout, portal return, webhook delivery, and `/settings` plan state.
- Do not let checkout or portal continue when service-role reads or writes fail; the app should fail closed instead of creating paid state that cannot be reconciled to the signed-in account.
- Use Stripe test subscriptions to verify active, canceled, and renewed states before switching any live-mode values.
