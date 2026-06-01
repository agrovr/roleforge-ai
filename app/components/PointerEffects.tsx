"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type CursorMode = "default" | "interactive" | "text" | "menu";

type MenuState = {
  open: boolean;
  x: number;
  y: number;
};

const MENU_WIDTH = 276;
const MENU_GAP = 14;

function canUseCustomPointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const frameRef = useRef(0);
  const latestPoint = useRef({ x: 0, y: 0 });
  const [cursorEnabled, setCursorEnabled] = useState(false);
  const [cursorMode, setCursorMode] = useState<CursorMode>("default");
  const [pressed, setPressed] = useState(false);
  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0 });

  const closeMenu = useCallback(() => {
    setMenu((current) => current.open ? { ...current, open: false } : current);
  }, []);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncCapability() {
      setCursorEnabled(canUseCustomPointer());
    }

    syncCapability();
    finePointer.addEventListener("change", syncCapability);
    reducedMotion.addEventListener("change", syncCapability);

    return () => {
      finePointer.removeEventListener("change", syncCapability);
      reducedMotion.removeEventListener("change", syncCapability);
    };
  }, []);

  useEffect(() => {
    if (!cursorEnabled) return undefined;

    const root = document.documentElement;
    root.classList.add("rf-custom-pointer");

    function update(event: PointerEvent) {
      latestPoint.current = { x: event.clientX, y: event.clientY };
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        const { x, y } = latestPoint.current;
        root.style.setProperty("--pointer-x", `${x}px`);
        root.style.setProperty("--pointer-y", `${y}px`);
        frameRef.current = 0;
      });
    }

    function updateMode(event: PointerEvent) {
      const target = event.target;
      if (isEditableTarget(target)) {
        setCursorMode("text");
        return;
      }
      if (target instanceof Element && target.closest("a, button, summary, [role='button'], [data-cursor='interactive']")) {
        setCursorMode("interactive");
        return;
      }
      setCursorMode("default");
    }

    function handlePointerDown() {
      setPressed(true);
    }

    function handlePointerUp() {
      setPressed(false);
    }

    window.addEventListener("pointermove", update, { passive: true });
    window.addEventListener("pointerover", updateMode, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });

    return () => {
      root.classList.remove("rf-custom-pointer");
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerover", updateMode);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [cursorEnabled]);

  useEffect(() => {
    function openMenu(event: MouseEvent) {
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target) || hasTextSelection()) {
        return;
      }

      event.preventDefault();
      const point = contextPoint(event);
      const position = clampMenuPosition(point.x, point.y);
      setCursorMode("menu");
      setMenu({ open: true, x: position.x, y: position.y });
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
  }, [closeMenu]);

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

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
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
      <div className="pointer-glow" aria-hidden="true" />
      {cursorEnabled ? (
        <>
          <div
            className={`rf-cursor-ring is-${cursorMode}${pressed ? " is-pressed" : ""}`}
            aria-hidden="true"
          />
          <div
            className={`rf-cursor-dot is-${cursorMode}${pressed ? " is-pressed" : ""}`}
            aria-hidden="true"
          />
        </>
      ) : null}
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
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(() => openPath("/app"))}>
            <span className="rf-context-menu-icon"><MenuIcon type="studio" /></span>
            <span>Open studio</span>
            <kbd>S</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(() => openPath("/templates"))}>
            <span className="rf-context-menu-icon"><MenuIcon type="templates" /></span>
            <span>Browse templates</span>
            <kbd>T</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(() => openPath("/settings"))}>
            <span className="rf-context-menu-icon"><MenuIcon type="settings" /></span>
            <span>Account settings</span>
            <kbd>A</kbd>
          </button>
          <span className="rf-context-menu-separator" role="separator" />
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(toggleTheme)}>
            <span className="rf-context-menu-icon"><MenuIcon type="theme" /></span>
            <span>Switch theme</span>
            <kbd>D</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(copyCurrentUrl)}>
            <span className="rf-context-menu-icon"><MenuIcon type="copy" /></span>
            <span>Copy page link</span>
            <kbd>C</kbd>
          </button>
          <button className="rf-context-menu-item" role="menuitem" type="button" onClick={() => runMenuAction(() => window.location.reload())}>
            <span className="rf-context-menu-icon"><MenuIcon type="refresh" /></span>
            <span>Refresh view</span>
            <kbd>R</kbd>
          </button>
          <div className="rf-context-menu-note">Hold Shift while right-clicking for the browser menu.</div>
        </div>
      ) : null}
    </>
  );
}
