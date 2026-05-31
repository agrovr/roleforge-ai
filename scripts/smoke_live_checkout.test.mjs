import assert from "node:assert/strict";
import test from "node:test";

import { smokeLiveCheckout } from "./smoke_live_checkout.mjs";

test("live checkout smoke refuses to run without a Supabase service role key", async () => {
  await assert.rejects(
    () => smokeLiveCheckout({ serviceRoleKey: "", publishableKey: "publishable", supabaseUrl: "https://example.supabase.co" }),
    /SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("live checkout smoke validates the billing interval before network calls", async () => {
  await assert.rejects(
    () => smokeLiveCheckout({ serviceRoleKey: "service-role", interval: "week" }),
    /interval must be month or year/,
  );
});
