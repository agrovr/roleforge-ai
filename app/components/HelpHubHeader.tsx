"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAccountStatus } from "../lib/accountStatusClient";
import { supportRequestHref } from "../lib/supportRequests";
import { SiteHeader } from "./SiteHeader";
import { PublicAccountMenu } from "./PublicAccountMenu";

export function HelpHubHeader({ active, signedIn: initialSignedIn }: { active: "help" | "support" | "status"; signedIn?: boolean }) {
  const supportHref = supportRequestHref({ category: "workflow", subject: { help: "Help center question", support: "Support page question", status: "Status page question" }[active], contextUrl: `/${active}` });
  const [signedIn, setSignedIn] = useState(initialSignedIn ?? false);
  useEffect(() => {
    if (initialSignedIn !== undefined) return;
    let live = true;
    loadAccountStatus<{ user?: unknown }>().then((status) => { if (live) setSignedIn(Boolean(status.user)); }).catch(() => {});
    return () => { live = false; };
  }, [initialSignedIn]);
  return <>
    <a className="site-skip-link" href="#help-hub-main">Skip to content</a>
    <SiteHeader active="help" signedIn={signedIn} studioHref={signedIn ? "/app" : "/login?next=%2Fapp"}><PublicAccountMenu supportHref={supportHref} /></SiteHeader>
    <nav className="help-hub-tabs" aria-label="Help and support">
      {[["help", "Help center"], ["support", "Contact support"], ["status", "System status"]].map(([key, label]) => <Link href={`/${key}`} key={key} aria-current={key === active ? "page" : undefined}>{label}</Link>)}
    </nav>
  </>;
}
