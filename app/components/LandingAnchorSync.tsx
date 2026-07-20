"use client";

import { useEffect } from "react";

const LANDING_SECTION_IDS = new Set([
  "how",
  "studio",
  "templates",
  "features",
  "pricing",
  "faq",
  "final-cta",
]);

function currentLandingTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!LANDING_SECTION_IDS.has(id)) return null;
  return { id, element: document.getElementById(id) };
}

function alignTarget(element: HTMLElement) {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  element.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
  root.style.scrollBehavior = previousScrollBehavior;
}

export function LandingAnchorSync() {
  useEffect(() => {
    let disposed = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    let observerTimer = 0;
    let resizeObserver: ResizeObserver | null = null;

    const clearScheduledAlignment = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(observerTimer);
      resizeObserver?.disconnect();
      resizeObserver = null;
    };

    const alignToHash = () => {
      clearScheduledAlignment();
      const target = currentLandingTarget();
      if (!target?.element) return;

      const run = () => {
        if (disposed || currentLandingTarget()?.id !== target.id) return;
        if (target.element) alignTarget(target.element);
      };

      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(run);
      });
      settleTimer = window.setTimeout(run, 320);
      void document.fonts?.ready.then(run);

      const shell = document.querySelector(".page-shell");
      if (shell && typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(run);
        resizeObserver.observe(shell);
        observerTimer = window.setTimeout(() => {
          resizeObserver?.disconnect();
          resizeObserver = null;
        }, 1800);
      }
    };

    alignToHash();
    window.addEventListener("hashchange", alignToHash);

    return () => {
      disposed = true;
      clearScheduledAlignment();
      window.removeEventListener("hashchange", alignToHash);
    };
  }, []);

  return null;
}
