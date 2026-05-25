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
- Active or trialing subscriptions set `plan = 'premium'`, unlock premium export entitlements, and set `monthly_run_limit = null`.
- Canceled, incomplete, past-due, or missing subscriptions fall back to free entitlements.
- Free entitlement keeps PDF export available and sets `monthly_run_limit = 5`.

## Operational checks

- Keep all Stripe and Supabase service credentials server-only.
- After changing Price IDs or webhook events, redeploy and confirm checkout, portal return, webhook delivery, and `/settings` plan state.
- Do not let checkout or portal continue when service-role reads or writes fail; the app should fail closed instead of creating paid state that cannot be reconciled to the signed-in account.
- Use Stripe test subscriptions to verify active, canceled, and renewed states before switching any live-mode values.
