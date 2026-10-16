"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  ["Templates", "/templates", "templates"],
  ["How it works", "/#how", "how"],
  ["Features", "/#features", "features"],
  ["Pricing", "/pricing", "pricing"],
  ["Help", "/help", "help"],
] as const;

export function SiteHeader({ landing = false, active = "", studioHref, signedIn = false, children, navigationLinks: customLinks, context }: {
  landing?: boolean; active?: string; studioHref?: string; signedIn?: boolean; children?: ReactNode;
  navigationLinks?: readonly (readonly [label: string, href: string, key: string])[];
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("");
  const menu = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!landing) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = "";
      for (const id of ["how", "studio", "templates", "features", "pricing", "faq", "final-cta"]) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 160) current = id;
      }
      setSection(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [landing]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const breakpoint = matchMedia("(min-width: 941px)");
    const resize = () => { if (breakpoint.matches) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    breakpoint.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      breakpoint.removeEventListener("change", resize);
    };
  }, [open]);

  function navigation() {
    const navigationLinks = customLinks ?? (signedIn
      ? [["Projects", "/home", "projects"] as const, ...links.filter(([, , key]) => key !== "how" && key !== "features")]
      : links);
    return navigationLinks.map(([label, destination, key]) => {
      const href = destination.startsWith("/#") ? landing ? destination.slice(1) : `/?view=site${destination.slice(1)}` : destination;
      const selected = landing ? href.startsWith("#") && section === key : active === key;
      return <Link className="site-header-link" key={key} href={href} prefetch={false} aria-current={selected ? landing ? "location" : "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>;
    });
  }

  return (
    <header className={`site-header ${landing ? "nav" : "login-nav studio-auth-nav"}`}>
      <div className={`site-header-inner${landing ? " nav-inner" : ""}`}>
        <Brand href="/" label="RoleForge AI home" />
        {context && <span className="site-header-context">{context}</span>}
        <nav className={`site-header-navigation${landing ? " nav-links" : ""}`} aria-label="Primary navigation">
          <div className="site-header-desktop">{navigation()}</div>
          <div className="site-header-menu" ref={menu} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
            <button ref={toggle} type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>Menu
            </button>
            <div className="site-header-menu-links" id={menuId} hidden={!open}>
              {navigation()}
              {signedIn && <Link href="/settings" prefetch={false} onClick={() => setOpen(false)}>My account</Link>}
              {studioHref && <>
                {!signedIn && <Link href={studioHref} prefetch={false} onClick={() => setOpen(false)}>Sign in</Link>}
                <Link href={studioHref} prefetch={false} onClick={() => setOpen(false)}>{signedIn ? "Open studio" : "Build my resume"}</Link>
              </>}
            </div>
          </div>
          <ThemeToggle />
          {children}
        </nav>
      </div>
    </header>
  );
}
