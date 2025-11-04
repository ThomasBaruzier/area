import React, { useCallback, useEffect, useId, useState } from "react";

import { applyTheme, getInitialTheme } from "../utils/theme";

export default function ThemeButton(): JSX.Element {
  const id = useId();
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent): void => {
      try {
        const saved = localStorage.getItem("theme");
        if (!saved) {
          const t: "light" | "dark" = e.matches ? "dark" : "light";
          setTheme(t);
        }
      } catch {
        /* ignore */
      }
    };
    media.addEventListener("change", handler);
    return (): void => {
      media.removeEventListener("change", handler);
    };
  }, []);

  const toggle = useCallback((): void => {
    setTheme((currentTheme) => {
      const newTheme = currentTheme === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", newTheme);
      } catch {
        /* ignore */
      }
      return newTheme;
    });
  }, []);

  const isLight = theme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      id={`theme-btn-${id}`}
      type="button"
      className="theme-btn"
      data-mode={theme}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <span className="icon sun" aria-hidden={!isLight}>
        <svg
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
          focusable="false"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="2.8" x2="12" y2="5.2" />
            <line x1="12" y1="18.8" x2="12" y2="21.2" />
            <line x1="2.8" y1="12" x2="5.2" y2="12" />
            <line x1="18.8" y1="12" x2="21.2" y2="12" />
            <line x1="4.6" y1="4.6" x2="6.3" y2="6.3" />
            <line x1="17.7" y1="17.7" x2="19.4" y2="19.4" />
            <line x1="4.6" y1="19.4" x2="6.3" y2="17.7" />
            <line x1="17.7" y1="6.3" x2="19.4" y2="4.6" />
          </g>
        </svg>
      </span>
      <span className="icon moon" aria-hidden={isLight}>
        <svg
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
          focusable="false"
          aria-hidden="true"
        >
          <path
            d="M21 13.2A8.5 8.5 0 1 1 10.8 3a7 7 0 1 0 10.2 10.2Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  );
}
