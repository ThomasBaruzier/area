import type { ReactNode } from "react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import apiFetch from "../utils/fetchApi";
import { ConnectionsContext } from "./ConnectionsContext";
import { useAuth } from "./useAuth";

export function ConnectionsProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isAuthenticated } = useAuth();
  const isAuthRef = useRef(isAuthenticated);
  isAuthRef.current = isAuthenticated;

  const [connections, setConnections] = useState<string[]>([]);
  const isLoadingRef = useRef(false);

  const fetchConnections = useCallback(async (): Promise<void> => {
    if (!isAuthRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    try {
      const data = await apiFetch<string[] | null>("/api/user/connections");
      setConnections(data || []);
    } catch (error) {
      console.error("Failed to fetch connections", error);
      setConnections([]);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchConnections();
    } else {
      setConnections([]);
    }
  }, [isAuthenticated, fetchConnections]);

  const isConnected = useCallback(
    (serviceName: string): boolean => {
      return connections.includes(serviceName.toLowerCase());
    },
    [connections],
  );

  const value = useMemo(
    () => ({
      connections,
      isConnected,
      fetchConnections,
    }),
    [connections, isConnected, fetchConnections],
  );

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
}
