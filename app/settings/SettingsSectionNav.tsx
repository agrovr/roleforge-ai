"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const scrollSpyLockUntilRef = useRef(0);
  const scrollToSection = useCallback((sectionId: SettingsSectionId, behavior: ScrollBehavior = "smooth") => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior, block: "start" });
  }, []);

  useEffect(() => {
    let frame = 0;

    const setActiveFromViewport = () => {
      if (Date.now() < scrollSpyLockUntilRef.current) return;

      const viewportOffset = 150;
      const sectionRects = settingsSections
        .map((section) => {
          const element = document.getElementById(section.id);
          return element ? { id: section.id, rect: element.getBoundingClientRect() } : null;
        })
        .filter((section): section is SettingsSectionRect => Boolean(section));
      const visibleSections = sectionRects.filter(
        (section) => section.rect.bottom > 0 && section.rect.top < window.innerHeight,
      );
      const isNearPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      const hash = window.location.hash.replace("#", "");
      const hashSection = sectionRects.find((section) => section.id === hash);
      if (hashSection && hashSection.rect.bottom > 0 && hashSection.rect.top < window.innerHeight) {
        setActiveSection(hashSection.id);
        return;
      }

      const current =
        isNearPageEnd && visibleSections.length > 0
          ? visibleSections[visibleSections.length - 1].id
          : sectionRects.find((section) => section.rect.top <= viewportOffset && section.rect.bottom > viewportOffset)
              ?.id ??
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
        scrollSpyLockUntilRef.current = Date.now() + 1200;
        setActiveSection(nextSection);
        window.requestAnimationFrame(() => scrollToSection(nextSection, "auto"));
        window.setTimeout(setActiveFromViewport, 260);
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
  }, [scrollToSection]);

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
          onClick={(event) => {
            event.preventDefault();
            window.history.pushState(null, "", `#${section.id}`);
            scrollSpyLockUntilRef.current = Date.now() + 1200;
            setActiveSection(section.id);
            scrollToSection(section.id);
          }}
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
