"use client";

import { useEffect, useState } from "react";
import { RoleForgeIcon } from "./RoleForgeIcons";

type Theme = "light" | "dark";
type ThemeState = {
  ready: boolean;
  theme: Theme;
};

const storageKey = "roleforge-theme";

function readTheme(): Theme {
  const params = new URLSearchParams(window.location.search);
  const themeParam = params.get("theme");

  if (themeParam === "dark" || themeParam === "light") {
    return themeParam;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [state, setState] = useState<ThemeState>({ ready: false, theme: "light" });

  useEffect(() => {
    const initialTheme = readTheme();
    applyTheme(initialTheme);

    const timer = window.setTimeout(() => {
      setState({ ready: true, theme: initialTheme });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!state.ready) return;

    applyTheme(state.theme);
    window.localStorage.setItem(storageKey, state.theme);
  }, [state]);

  const theme = state.theme;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const iconName = state.ready && theme === "dark" ? "sun" : "moon";

  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      className="icon-button theme-toggle"
      onClick={() => setState({ ready: true, theme: nextTheme })}
      suppressHydrationWarning
      type="button"
    >
      {state.ready ? <RoleForgeIcon name={iconName} size={18} /> : <span className="theme-toggle-dot" aria-hidden="true" />}
    </button>
  );
}
