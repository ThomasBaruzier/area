export type Theme = "light" | "dark";

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  updateFavicon();
}

function updateFavicon(): void {
  const favicon = document.getElementById("favicon");
  if (favicon instanceof HTMLLinkElement) {
    const browserTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    favicon.href =
      browserTheme === "dark" ? "/logo-white.png" : "/logo-black.png";
  }
}

(function () {
  const initialTheme = getInitialTheme();
  document.documentElement.dataset.theme = initialTheme;
})();
