import React, { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../auth/useAuth";
import type { User } from "../types/user";

function getInitialFromUser(user: User | null): string | null {
  if (!user) return null;
  const raw = user.initial ?? user.name ?? user.username;
  const s = raw.trim();
  const ch = s.charAt(0);
  return ch ? ch.toUpperCase() : null;
}

type JwtPayload = {
  initial?: unknown;
  username?: unknown;
  name?: unknown;
  email?: unknown;
  sub?: unknown;
  id?: unknown;
};

function getInitialFromToken(token?: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as JwtPayload;
    const raw =
      payload.initial ??
      payload.username ??
      payload.name ??
      payload.email ??
      payload.sub ??
      payload.id;

    if (typeof raw !== "string" && typeof raw !== "number") {
      return null;
    }
    const s = String(raw).trim();
    const ch = s.charAt(0);
    return ch ? ch.toUpperCase() : null;
  } catch {
    return null;
  }
}

export default function UserAvatar(): JSX.Element {
  const { user, token, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = useMemo(
    () => getInitialFromUser(user) ?? getInitialFromToken(token) ?? "?",
    [user, token],
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return (): void => {
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  const size = 40;
  const label = user?.username || user?.email || "Account";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        data-testid="user-avatar-button"
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "1px solid var(--color-border, #ddd)",
          background: "var(--color-surface, #fff)",
          color: "var(--color-text, #222)",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 180,
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #e5e5e5)",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            padding: 8,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--color-text-muted, #666)",
              borderBottom: "1px solid var(--color-border, #eee)",
              marginBottom: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.username || user?.email || "Connected"}
          </div>

          <button
            data-testid="logout-button"
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>): void => {
              e.currentTarget.style.background = "rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>): void => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
