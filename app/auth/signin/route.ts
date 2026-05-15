import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeRedirectPath(form.get("next"));

  if (!email) {
    redirect(`${next}?account=signin-error`);
  }

  const supabase = await createRoleForgeServerClient();
  if (!supabase) {
    redirect(`${next}?account=account-not-configured`);
  }

  const origin = new URL(request.url).origin;
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`${next}?account=signin-error`);
  }

  redirect(`${next}?account=check-email`);
}
