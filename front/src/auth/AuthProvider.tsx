import type { ReactNode } from "react";
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { User } from "../types/user";
import { AuthContext } from "./AuthContext";

type JwtPayload = {
  sub: string | number;
  username: string;
  email: string;
  role?: string;
};

function decodeJwt(token: string): User | null {
  try {
    const payloadString = atob(token.split(".")[1]);
    if (!payloadString) return null;
    const payload = JSON.parse(payloadString) as JwtPayload;

    if (
      (typeof payload.sub !== "string" && typeof payload.sub !== "number") ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return {
      id: String(payload.sub),
      username: payload.username,
      email: payload.email,
    };
  } catch (_e) {
    return null;
  }
}

function decodeRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payloadString = atob(token.split(".")[1] || "");
    if (!payloadString) return null;
    const payload = JSON.parse(payloadString) as JwtPayload;
    const r = payload.role;
    return typeof r === "string" ? r : null;
  } catch {
    return null;
  }
}

type AuthState = {
  token: string | null;
  user: User | null;
};

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || !rawUser) {
        return { token: null, user: null };
      }

      const parsedUser = JSON.parse(rawUser) as User;
      const decodedUserFromToken = decodeJwt(token);

      if (
        typeof parsedUser.id === "string" &&
        decodedUserFromToken &&
        parsedUser.id === decodedUserFromToken.id
      ) {
        return { token, user: parsedUser };
      }
    } catch {
      /* ignore */
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  });

  const { token, user } = authState;
  const navigate = useNavigate();

  const logout = useCallback((): void => {
    setAuthState({ user: null, token: null });
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    void navigate("/login");
  }, [navigate]);

  const login = useCallback(
    (accessToken: string): void => {
      const decodedUser = decodeJwt(accessToken);
      if (decodedUser) {
        setAuthState({ user: decodedUser, token: accessToken });
        localStorage.setItem("user", JSON.stringify(decodedUser));
        localStorage.setItem("token", accessToken);
      } else {
        logout();
      }
    },
    [logout],
  );

  const role = useMemo(() => decodeRoleFromToken(token), [token]);
  const isAdmin = useMemo(
    () => (role ? role.toUpperCase() === "ADMIN" : false),
    [role],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      role,
      isAdmin,
      login,
      logout,
    }),
    [user, token, role, isAdmin, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
