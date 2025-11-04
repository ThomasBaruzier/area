import { createContext } from "react";

export type ConnectionsContextType = {
  connections: string[];
  isConnected: (serviceName: string) => boolean;
  fetchConnections: () => Promise<void>;
};

export const ConnectionsContext = createContext<
  ConnectionsContextType | undefined
>(undefined);
