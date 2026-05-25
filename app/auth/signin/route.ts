import { redirect } from "next/navigation";

import { redirectPathWithParam, safeRedirectPath } from "@/app/lib/safeRedirect";
import { getRequestOrigin } from "@/app/lib/siteUrl";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeRedirectPath(form.get("next"));
  const statusNext = safeRedirectPath(form.get("statusNext"), next);

  if (!email) {
    redirect(redirectPathWithParam(statusNext, "account", "signin-error"));
  }

  const supabase = await createRoleForgeServerClient();
  if (!supabase) {
    redirect(redirectPathWithParam(statusNext, "account", "account-not-configured"));
  }

  const origin = getRequestOrigin(request.url);
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(redirectPathWithParam(statusNext, "account", "signin-error"));
  }

  redirect(redirectPathWithParam(statusNext, "account", "check-email"));
}
