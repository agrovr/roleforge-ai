"use client";

import { useEffect, useRef, useState } from "react";
import { RoleForgeIcon } from "../components/RoleForgeIcons";

const settingsSections = [
  { id: "account", label: "Account", icon: "settings" },
  { id: "projects", label: "Saved projects", icon: "chart" },
  { id: "usage", label: "Usage", icon: "sparkle" },
  { id: "exports", label: "Exports", icon: "download" },
  { id: "billing", label: "Billing", icon: "lock" },
] as const;

type SettingsSectionId = (typeof settingsSections)[number]["id"];
type SettingsSectionRect = { id: SettingsSectionId; rect: DOMRect };

export function SettingsSectionNav() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    let frame = 0;

    const setActiveFromViewport = () => {
      const viewportOffset = 150;
      const sectionRects = settingsSections
        .map((section) => {
          const element = document.getElementById(section.id);
          return element ? { id: section.id, rect: element.getBoundingClientRect() } : null;
        })
        .filter((section): section is SettingsSectionRect => Boolean(section));

      const current =
        sectionRects.find((section) => section.rect.top <= viewportOffset && section.rect.bottom > viewportOffset)?.id ??
        sectionRects.find((section) => section.rect.top > viewportOffset)?.id ??
        "billing";

      setActiveSection(current);
    };

    const scheduleViewportUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(setActiveFromViewport);
    };

    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      const nextSection = settingsSections.find((section) => section.id === hash)?.id;
      if (nextSection) {
        setActiveSection(nextSection);
        window.setTimeout(setActiveFromViewport, 180);
      } else {
        setActiveFromViewport();
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    window.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
    window.addEventListener("resize", scheduleViewportUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", updateFromHash);
      window.removeEventListener("scroll", scheduleViewportUpdate);
      window.removeEventListener("resize", scheduleViewportUpdate);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const link = linkRefs.current[activeSection];
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;

    const targetLeft = Math.max(0, link.offsetLeft - 8);
    nav.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [activeSection]);

  return (
    <aside className="settings-page-nav" aria-label="Settings sections" ref={navRef}>
      {settingsSections.map((section) => (
        <a
          className={activeSection === section.id ? "active" : ""}
          href={`#${section.id}`}
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          ref={(element) => {
            linkRefs.current[section.id] = element;
          }}
        >
          <RoleForgeIcon name={section.icon} size={15} /> {section.label}
        </a>
      ))}
    </aside>
  );
}
