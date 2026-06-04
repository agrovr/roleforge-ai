"use client";

import { useEffect } from "react";

function openAccountMenus() {
  return Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-account-menu][open]"));
}

function accountMenuSummary(menu: HTMLDetailsElement) {
  return menu.querySelector<HTMLElement>("summary");
}

function syncMenuState(menu: HTMLDetailsElement) {
  accountMenuSummary(menu)?.setAttribute("aria-expanded", menu.open ? "true" : "false");
}

function closeMenu(menu: HTMLDetailsElement, options: { restoreFocus?: boolean } = {}) {
  const wasOpen = menu.open;
  menu.removeAttribute("open");
  syncMenuState(menu);
  if (options.restoreFocus && wasOpen) accountMenuSummary(menu)?.focus();
}

function closeOtherMenus(activeMenu: HTMLDetailsElement) {
  for (const menu of openAccountMenus()) {
    if (menu !== activeMenu) closeMenu(menu);
  }
}

function currentFocusedMenu() {
  const activeElement = document.activeElement;
  return activeElement instanceof Element ? activeElement.closest<HTMLDetailsElement>("details[data-account-menu]") : null;
}

export function AccountMenuBehavior() {
  useEffect(() => {
    for (const menu of document.querySelectorAll<HTMLDetailsElement>("details[data-account-menu]")) {
      syncMenuState(menu);
    }

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
      const focusedMenu = currentFocusedMenu();
      const menus = openAccountMenus();
      if (!menus.length) return;
      event.preventDefault();
      for (const menu of openAccountMenus()) {
        closeMenu(menu, { restoreFocus: menu === focusedMenu || (!focusedMenu && menus.length === 1) });
      }
    }

    function handleToggle(event: Event) {
      const menu = event.target;
      if (!(menu instanceof HTMLDetailsElement) || !menu.matches("details[data-account-menu]")) return;
      if (menu.open) closeOtherMenus(menu);
      syncMenuState(menu);
    }

    function handleFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const currentMenu = target.closest<HTMLDetailsElement>("details[data-account-menu]");
      if (currentMenu?.open) {
        closeOtherMenus(currentMenu);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("toggle", handleToggle, true);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("toggle", handleToggle, true);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return null;
}
