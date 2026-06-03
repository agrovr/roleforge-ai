"use client";

import { useEffect } from "react";

function openAccountMenus() {
  return Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-account-menu][open]"));
}

function closeMenu(menu: HTMLDetailsElement) {
  menu.removeAttribute("open");
}

export function AccountMenuBehavior() {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const currentMenu = target.closest<HTMLDetailsElement>("details[data-account-menu]");
      if (currentMenu) {
        if (!target.closest("summary") && target.closest("a, button[type='submit']")) {
          closeMenu(currentMenu);
        }
        return;
      }

      for (const menu of openAccountMenus()) {
        closeMenu(menu);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      for (const menu of openAccountMenus()) {
        closeMenu(menu);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
