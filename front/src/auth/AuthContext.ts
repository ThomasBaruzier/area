import { createContext } from "react";

import type { User } from "../types/user";

export type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: string | null;
  isAdmin: boolean;

  login: (accessToken: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
