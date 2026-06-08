"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type MenuState = {
  open: boolean;
  x: number;
  y: number;
};

type QuickActionKey = "s" | "t" | "a" | "d" | "c" | "r";

const MENU_WIDTH = 276;
const MENU_GAP = 14;

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable=''], .rf-native-context"));
}

function hasTextSelection() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

function contextPoint(event: MouseEvent) {
  if (event.clientX || event.clientY) {
    return { x: event.clientX, y: event.clientY };
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    const rect = active.getBoundingClientRect();
    return {
      x: rect.left + Math.min(rect.width / 2, 160),
      y: rect.top + Math.min(rect.height / 2, 120),
    };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function clampMenuPosition(x: number, y: number, width = MENU_WIDTH, height = 320) {
  return {
    x: Math.min(Math.max(MENU_GAP, x), Math.max(MENU_GAP, window.innerWidth - width - MENU_GAP)),
    y: Math.min(Math.max(MENU_GAP, y), Math.max(MENU_GAP, window.innerHeight - height - MENU_GAP)),
  };
}

function openPath(path: string) {
  window.location.assign(path);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  localStorage.setItem("roleforge-theme", next);
}

async function copyCurrentUrl() {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(window.location.href);
}

function quickActionHandlers(): Record<QuickActionKey, () => void | Promise<void>> {
  return {
    s: () => openPath("/app"),
    t: () => openPath("/templates"),
    a: () => openPath("/settings"),
    d: toggleTheme,
    c: copyCurrentUrl,
    r: () => window.location.reload(),
  };
}

function MenuIcon({ type }: { type: "studio" | "templates" | "settings" | "theme" | "copy" | "refresh" }) {
  if (type === "studio") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 6.5h14M5 12h9M5 17.5h11" />
      </svg>
    );
  }

  if (type === "templates") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 5.5h6.5v6H5zM12.5 5.5H19v13h-6.5zM5 13h6.5v5.5H5z" />
      </svg>
    );
  }

  if (type === "settings") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        <path d="M18.7 13.1c.1-.4.1-.7.1-1.1s0-.7-.1-1.1l2-1.5-1.9-3.2-2.4 1a8 8 0 0 0-1.9-1.1L14.2 3h-4.4l-.3 3.1c-.7.3-1.3.6-1.9 1.1l-2.4-1-1.9 3.2 2 1.5c-.1.4-.1.7-.1 1.1s0 .7.1 1.1l-2 1.5 1.9 3.2 2.4-1c.6.5 1.2.8 1.9 1.1l.3 3.1h4.4l.3-3.1c.7-.3 1.3-.6 1.9-1.1l2.4 1 1.9-3.2-2-1.5Z" />
      </svg>
    );
  }

  if (type === "theme") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3.5v17M5.6 6.2a9 9 0 0 0 0 11.6M18.4 6.2a9 9 0 0 1 0 11.6" />
      </svg>
    );
  }

  if (type === "copy") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9 8h10v11H9z" />
        <path d="M5 15V5h10" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4.5v5h-5" />
    </svg>
  );
}

export function PointerEffects() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0 });

  const openQuickMenu = useCallback((point?: { x: number; y: number }) => {
    const position = clampMenuPosition(point?.x ?? window.innerWidth / 2, point?.y ?? Math.min(window.innerHeight / 2, 420));
    setMenu({ open: true, x: position.x, y: position.y });
  }, []);

  const closeMenu = useCallback(() => {
    setMenu((current) => current.open ? { ...current, open: false } : current);
  }, []);

  useEffect(() => {
    function openMenu(event: MouseEvent) {
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target) || hasTextSelection()) {
        return;
      }

      event.preventDefault();
      const point = contextPoint(event);
      openQuickMenu(point);
    }

    function closeFromPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    }

    function closeFromScroll() {
      closeMenu();
    }

    document.addEventListener("contextmenu", openMenu);
    document.addEventListener("pointerdown", closeFromPointer, { passive: true });
    window.addEventListener("scroll", closeFromScroll, { passive: true });
    window.addEventListener("resize", closeFromScroll, { passive: true });

    return () => {
      document.removeEventListener("contextmenu", openMenu);
      document.removeEventListener("pointerdown", closeFromPointer);
      window.removeEventListener("scroll", closeFromScroll);
      window.removeEventListener("resize", closeFromScroll);
    };
  }, [closeMenu, openQuickMenu]);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (menu.open) {
          closeMenu();
        } else {
          openQuickMenu();
        }
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [closeMenu, menu.open, openQuickMenu]);

  useEffect(() => {
    if (!menu.open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const next = clampMenuPosition(menu.x, menu.y, rect.width, rect.height);
    if (next.x !== menu.x || next.y !== menu.y) {
      setMenu((current) => ({ ...current, ...next }));
      return;
    }
    menuRef.current.querySelector<HTMLButtonElement>(".rf-context-menu-item")?.focus();
  }, [menu]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(".rf-context-menu-item") ?? []);
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const shortcut = event.key.toLowerCase();

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (shortcut === "k" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && ["s", "t", "a", "d", "c", "r"].includes(shortcut)) {
      event.preventDefault();
      runMenuAction(quickActionHandlers()[shortcut as QuickActionKey]);
      return;
    }

    if (!items.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    }
  }

  function runMenuAction(action: () => void | Promise<void>) {
    closeMenu();
    void Promise.resolve(action()).catch(() => {});
  }

  return (
    <>
      {menu.open ? (
        <div
          ref={menuRef}
          className="rf-context-menu"
          role="menu"
          aria-label="RoleForge quick actions"
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="rf-context-menu-header">
            <span>RoleForge AI</span>
            <small>Quick actions</small>
          </div>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().s)}>
            <span className="rf-context-menu-icon"><MenuIcon type="studio" /></span>
            <span>Open studio</span>
            <kbd>S</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().t)}>
            <span className="rf-context-menu-icon"><MenuIcon type="templates" /></span>
            <span>Browse templates</span>
            <kbd>T</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().a)}>
            <span className="rf-context-menu-icon"><MenuIcon type="settings" /></span>
            <span>Account settings</span>
            <kbd>A</kbd>
          </button>
          <span className="rf-context-menu-separator" role="separator" />
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().d)}>
            <span className="rf-context-menu-icon"><MenuIcon type="theme" /></span>
            <span>Switch theme</span>
            <kbd>D</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().c)}>
            <span className="rf-context-menu-icon"><MenuIcon type="copy" /></span>
            <span>Copy page link</span>
            <kbd>C</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(quickActionHandlers().r)}>
            <span className="rf-context-menu-icon"><MenuIcon type="refresh" /></span>
            <span>Refresh view</span>
            <kbd>R</kbd>
          </button>
          <div className="rf-context-menu-note">Press Ctrl/Command+K for quick actions. Hold Shift while right-clicking for the browser menu.</div>
        </div>
      ) : null}
    </>
  );
}
