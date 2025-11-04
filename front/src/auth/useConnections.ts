import { useContext } from "react";

import {
  ConnectionsContext,
  type ConnectionsContextType,
} from "./ConnectionsContext";

export function useConnections(): ConnectionsContextType {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error("useConnections must be used within a ConnectionsProvider");
  }
  return context;
}
