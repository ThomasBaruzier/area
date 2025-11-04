import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { getInitialTheme } from "../utils/theme";
import type { PillNavItem } from "./PillNav/PillNav";
import PillNav from "./PillNav/PillNav";
import ThemeButton from "./ThemeButton";
import UserAvatar from "./UserAvatar";

export default function Header(): JSX.Element {
  const { pathname } = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const handleThemeChange = () => {
      const theme = getInitialTheme();
      setCurrentTheme(theme);
    };

    const themeChangeListener = () => {
      handleThemeChange();
    };
    window.addEventListener("storage", themeChangeListener);

    const observer = new MutationObserver(themeChangeListener);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    handleThemeChange();

    return () => {
      window.removeEventListener("storage", themeChangeListener);
      observer.disconnect();
    };
  }, []);

  const logoPath =
    currentTheme === "dark" ? "/logo-white.png" : "/logo-black.png";

  const items: PillNavItem[] = useMemo(() => {
    const base: PillNavItem[] = [
      { label: "Home", href: "/" },
      { label: "Workflows", href: "/workflow/list" },
      { label: "Services", href: "/services" },
    ];

    if (isAuthenticated && isAdmin) {
      base.push({ label: "Users", href: "/admin/users" });
    }

    if (!isAuthenticated) {
      base.push({ label: "Login", href: "/login" });
    }

    return base;
  }, [isAuthenticated, isAdmin]);

  return (
    <header className="app-header">
      <PillNav
        logo={logoPath}
        logoAlt="Area"
        items={items}
        activeHref={pathname}
        baseColor="var(--color-bg)"
        pillColor="var(--color-surface)"
        hoveredPillTextColor="var(--color-text)"
        pillTextColor="var(--color-text-muted)"
      />

      <div
        className="header-tools"
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <ThemeButton />
        {isAuthenticated && <UserAvatar />}
      </div>
    </header>
  );
}
