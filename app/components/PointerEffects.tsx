"use client";

import { useEffect } from "react";

export function PointerEffects() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let frame = 0;
    const root = document.documentElement;

    function update(event: PointerEvent) {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        root.style.setProperty("--pointer-x", `${event.clientX}px`);
        root.style.setProperty("--pointer-y", `${event.clientY}px`);
        frame = 0;
      });
    }

    window.addEventListener("pointermove", update, { passive: true });

    return () => {
      window.removeEventListener("pointermove", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="pointer-glow" aria-hidden="true" />;
}
