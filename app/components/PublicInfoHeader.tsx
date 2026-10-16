"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAccountStatus } from "../lib/accountStatusClient";
import { supportRequestHref } from "../lib/supportRequests";
import { SiteHeader } from "./SiteHeader";
import { PublicAccountMenu } from "./PublicAccountMenu";

export function PublicInfoHeader({ active }: { active: "privacy" | "terms" | "updates" | "not-found" }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    loadAccountStatus<{ user?: unknown }>().then((status) => { if (live) setSignedIn(Boolean(status.user)); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return <>
    <a className="site-skip-link" href="#public-info-main">Skip to content</a>
    <SiteHeader signedIn={signedIn} studioHref={signedIn ? "/app" : "/login?next=%2Fapp"}>
      <PublicAccountMenu supportHref={supportRequestHref({ category: "workflow", subject: active === "updates" ? "Product updates question" : active === "not-found" ? "Missing page question" : "Policy page question", contextUrl: active === "not-found" ? "/help" : `/${active}` })} />
    </SiteHeader>
    {active !== "not-found" && <nav className="public-info-tabs" aria-label="Policies and updates">
      {[["privacy", "Privacy"], ["terms", "Terms"], ["updates", "Updates"]].map(([key, label]) => <Link key={key} href={`/${key}`} aria-current={active === key ? "page" : undefined}>{label}</Link>)}
    </nav>}
  </>;
}
