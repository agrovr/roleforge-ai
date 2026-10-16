import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accountDisplayName } from "../lib/accountUser";
import { loadAccountProfile } from "../lib/accountProfile";
import { loadAccountEntitlement } from "../lib/entitlements";
import { createRoleForgeServerClient } from "../lib/supabase/server";
import { withAccountDatabase } from "../lib/supabase/accountDatabase";
import { loadSavedRunsPage } from "../lib/supabase/savedProjects";
import { loadAccountUsage } from "../lib/usage";
import { ProjectHome } from "./ProjectHome";
import "./home.css";

export const metadata: Metadata = { title: "Your projects", robots: { index: false, follow: false } };

export default async function HomePage() {
  const client = await createRoleForgeServerClient();
  if (!client) redirect("/login?next=%2Fhome");
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fhome");
  const [entitlement, profile] = await Promise.all([loadAccountEntitlement(client, user.id), loadAccountProfile(client, user.id)]);
  const [projects, usage] = await Promise.allSettled([
    withAccountDatabase(client, (db) => loadSavedRunsPage(db, user.id, { offset: 0 }), { label: "Projects home load" }),
    withAccountDatabase(client, (db) => loadAccountUsage(db, user.id, entitlement, { throwOnError: true }), { label: "Projects home usage" }),
  ]);
  return <ProjectHome name={accountDisplayName(user, profile?.displayName)}
    initialPage={projects.status === "fulfilled" ? projects.value : null}
    usage={usage.status === "fulfilled" ? usage.value : null} />;
}
