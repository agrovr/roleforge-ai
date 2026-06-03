"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { RoleForgeIcon } from "../components/RoleForgeIcons";

const settingsSections = [
  { id: "account", label: "Account", icon: "settings", keywords: "profile name email avatar export delete" },
  { id: "security", label: "Security", icon: "lock", keywords: "sign in login verification created metadata" },
  { id: "preferences", label: "Preferences", icon: "layers", keywords: "template resume direction default style" },
  { id: "projects", label: "Saved projects", icon: "chart", keywords: "history restore rename remove applications" },
  { id: "usage", label: "Usage", icon: "sparkle", keywords: "runs monthly allowance limits premium" },
  { id: "exports", label: "Exports", icon: "download", keywords: "pdf docx txt downloads formats premium" },
  { id: "support", label: "Support", icon: "mail", keywords: "help request contact issues tickets" },
  { id: "billing", label: "Billing", icon: "lock", keywords: "premium stripe checkout portal plan invoices cancel" },
] as const;

type SettingsSectionId = (typeof settingsSections)[number]["id"];
type SettingsSectionRect = { id: SettingsSectionId; rect: DOMRect };

export function SettingsSectionNav() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
  const [query, setQuery] = useState("");
  const navRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const scrollSpyLockUntilRef = useRef(0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = normalizedQuery
    ? settingsSections.filter((section) =>
        `${section.id} ${section.label} ${section.keywords}`.toLowerCase().includes(normalizedQuery),
      )
    : settingsSections;

  const scrollToSection = useCallback((sectionId: SettingsSectionId, behavior: ScrollBehavior = "smooth") => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior, block: "start" });
  }, []);
  const navigateToSection = useCallback((sectionId: SettingsSectionId, behavior: ScrollBehavior = "smooth") => {
    window.history.pushState(null, "", `#${sectionId}`);
    scrollSpyLockUntilRef.current = Date.now() + 1200;
    setActiveSection(sectionId);
    scrollToSection(sectionId, behavior);
  }, [scrollToSection]);

  const focusSectionLink = useCallback((sectionId: SettingsSectionId) => {
    window.setTimeout(() => linkRefs.current[sectionId]?.focus({ preventScroll: true }), 40);
  }, []);

  const moveSectionFocus = useCallback((sectionId: SettingsSectionId) => {
    navigateToSection(sectionId, "auto");
    focusSectionLink(sectionId);
  }, [focusSectionLink, navigateToSection]);

  function onSectionKeyDown(event: KeyboardEvent<HTMLAnchorElement>, sectionId: SettingsSectionId) {
    const currentIndex = visibleSections.findIndex((section) => section.id === sectionId);
    if (currentIndex < 0) return;
    const previousSection = visibleSections[(currentIndex - 1 + visibleSections.length) % visibleSections.length].id;
    const nextSection = visibleSections[(currentIndex + 1) % visibleSections.length].id;
    const keyActions: Record<string, SettingsSectionId> = {
      ArrowLeft: previousSection,
      ArrowUp: previousSection,
      ArrowRight: nextSection,
      ArrowDown: nextSection,
      Home: visibleSections[0].id,
      End: visibleSections[visibleSections.length - 1].id,
    };
    const nextSectionId = keyActions[event.key];
    if (!nextSectionId) return;
    event.preventDefault();
    moveSectionFocus(nextSectionId);
  }

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
    <aside className="settings-page-nav" aria-label="Settings sections">
      <label className="settings-section-search">
        <span>Find settings</span>
        <div>
          <RoleForgeIcon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Billing, exports, saved projects..."
            autoComplete="off"
          />
        </div>
      </label>
      <div className="settings-section-list" aria-label="Matching settings sections" ref={navRef}>
        {visibleSections.map((section) => (
          <a
            className={activeSection === section.id ? "active" : ""}
            href={`#${section.id}`}
            key={section.id}
            aria-current={activeSection === section.id ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigateToSection(section.id);
            }}
            onKeyDown={(event) => onSectionKeyDown(event, section.id)}
            ref={(element) => {
              linkRefs.current[section.id] = element;
            }}
          >
            <RoleForgeIcon name={section.icon} size={15} /> {section.label}
          </a>
        ))}
      </div>
      {visibleSections.length ? null : (
        <div className="settings-section-empty" role="status">
          No settings match.
        </div>
      )}
    </aside>
  );
}
