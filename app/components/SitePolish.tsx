"use client";

import { useEffect } from "react";

const REVEAL_SELECTORS = [
  ".hero-copy",
  ".hero-stage",
  ".templates-head",
  ".template-card",
  ".step-card",
  ".feature-card",
  ".price-card",
  ".pricing-clarity-grid a",
  ".cta-band",
  ".legal-hero",
  ".legal-index",
  ".legal-card",
  ".legal-footer-card",
  ".help-signal-card",
  ".help-action-card",
  ".help-quick-link",
  ".support-routing-step",
  ".support-guide-card",
  ".support-triage-card",
  ".support-request-card",
  ".support-packet-card",
  ".support-response-card",
  ".updates-hero-card",
  ".updates-ledger",
  ".updates-card",
  ".status-card",
  ".status-diagnostic-card",
  ".templates-page-hero",
  ".templates-selection-status",
  ".templates-fit-guide article",
  ".templates-decision-guide",
  ".templates-guide-card",
  ".templates-page-card",
  ".settings-page-hero",
  ".settings-section",
  ".settings-card",
  ".settings-account-overview",
  ".settings-account-health-card",
  ".settings-activity-item",
  ".settings-plan-access-item",
  ".settings-plan-info-item",
  ".settings-project-item",
  ".studio-hero",
  ".studio-card",
  ".studio-stat",
  ".rf-studio-hero",
  ".rf-preflight-panel",
  ".rf-preflight-item",
  ".export-readiness-panel",
  ".export-readiness-item",
  ".rf-recovery-card",
  ".empty-state",
  ".admin-support-commandbar",
  ".admin-support-hero",
  ".admin-support-playbook",
  ".admin-support-readiness-card",
  ".admin-support-filter",
  ".admin-support-card",
  ".suggestion",
  ".ats-item",
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

  return (
    <>
      <div className="rf-scroll-progress" aria-hidden="true">
        <span />
      </div>
      <div className="rf-ambient-field" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="rf-page-texture" aria-hidden="true" />
    </>
  );
}
