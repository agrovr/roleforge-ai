"use client";

import { useEffect } from "react";

const REVEAL_SELECTORS = [
  ".templates-head",
  ".steps",
  ".faq-grid",
  ".cta-band",
  ".legal-hero",
  ".legal-index",
  ".legal-footer-card",
  ".updates-hero-card",
  ".updates-ledger",
  ".templates-page-hero",
  ".templates-selection-status",
  ".templates-fit-guide",
  ".templates-decision-guide",
  ".templates-page-grid",
  ".settings-page-hero",
  ".settings-section",
  ".settings-account-overview",
  ".studio-hero",
  ".rf-studio-hero",
  ".rf-preflight-panel",
  ".export-readiness-panel",
  ".rf-recovery-card",
  ".empty-state",
  ".admin-support-commandbar",
  ".admin-support-hero",
  ".admin-support-playbook",
  ".admin-support-filter",
  ".admin-support-list",
].join(",");

export function SitePolish() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("rf-polish-ready");

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      root.classList.add("rf-reveal-disabled");
      return () => {
        root.classList.remove("rf-polish-ready", "rf-reveal-disabled");
      };
    }

    const candidates = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS))
      .filter((element) => !element.closest("[aria-hidden='true']"));

    candidates.forEach((element, index) => {
      element.dataset.polishReveal = "true";
      element.style.setProperty("--rf-reveal-index", String(index % 6));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.dataset.polishVisible = "true";
          observer.unobserve(element);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.14 },
    );

    candidates.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      candidates.forEach((element) => {
        delete element.dataset.polishReveal;
        delete element.dataset.polishVisible;
        element.style.removeProperty("--rf-reveal-index");
      });
      root.classList.remove("rf-polish-ready");
    };
  }, []);

  return null;
}
