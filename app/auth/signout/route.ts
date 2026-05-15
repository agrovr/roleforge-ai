import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/app/lib/safeRedirect";
import { createRoleForgeServerClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const next = safeRedirectPath(form.get("next"));
  const supabase = await createRoleForgeServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect(`${next}?account=signed-out`);
}
