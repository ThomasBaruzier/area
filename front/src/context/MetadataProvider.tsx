import type { ReactNode } from "react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ActionOrReaction, Service } from "../types/workflow";
import apiFetch from "../utils/fetchApi";
import { MetadataContext } from "./MetadataContext";

type ApiItem = {
  id: number;
  name: string;
  description: string;
  jsonFormat: Record<string, unknown>;
};

export function MetadataProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const actionsCache = useRef(new Map<string, ActionOrReaction[]>());
  const reactionsCache = useRef(new Map<string, ActionOrReaction[]>());

  const getActions = useCallback(
    async (serviceId: number | string): Promise<ActionOrReaction[]> => {
      const key = String(serviceId);
      const cached = actionsCache.current.get(key);
      if (cached) {
        return cached;
      }

      const res = await apiFetch<ApiItem[] | null>(`/api/actions/${key}`);
      const list: ActionOrReaction[] = (res || []).map((it) => ({
        ...it,
        type: "action",
      }));
      actionsCache.current.set(key, list);
      return list;
    },
    [],
  );

  const getReactions = useCallback(
    async (serviceId: number | string): Promise<ActionOrReaction[]> => {
      const key = String(serviceId);
      const cached = reactionsCache.current.get(key);
      if (cached) {
        return cached;
      }

      const res = await apiFetch<ApiItem[] | null>(`/api/reactions/${key}`);
      const list: ActionOrReaction[] = (res || []).map((it) => ({
        ...it,
        type: "reaction",
      }));
      reactionsCache.current.set(key, list);
      return list;
    },
    [],
  );

  useEffect(() => {
    void (async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await apiFetch<Service[] | null>("/api/services");
        const fetchedServices = data || [];
        setServices(fetchedServices);

        if (fetchedServices.length > 0) {
          const metadataFetches = fetchedServices.flatMap((service) => [
            getActions(service.id),
            getReactions(service.id),
          ]);
          await Promise.allSettled(metadataFetches);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load services.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [getActions, getReactions]);

  const getService = useCallback(
    (id: number | string): Service | undefined =>
      services.find((s) => String(s.id) === String(id)),
    [services],
  );

  const getActionName = useCallback(
    (serviceId: number, actionId: number): string => {
      const actions = actionsCache.current.get(String(serviceId));
      const action = actions?.find((a) => a.id === actionId);
      return (
        action?.description || action?.name || `Action #${String(actionId)}`
      );
    },
    [],
  );

  const getReactionName = useCallback(
    (serviceId: number, reactionId: number): string => {
      const reactions = reactionsCache.current.get(String(serviceId));
      const reaction = reactions?.find((r) => r.id === reactionId);
      return (
        reaction?.description ||
        reaction?.name ||
        `Reaction #${String(reactionId)}`
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      services,
      loading,
      error,
      getService,
      getActions,
      getReactions,
      getActionName,
      getReactionName,
    }),
    [
      services,
      loading,
      error,
      getService,
      getActions,
      getReactions,
      getActionName,
      getReactionName,
    ],
  );

  return (
    <MetadataContext.Provider value={value}>
      {children}
    </MetadataContext.Provider>
  );
}
