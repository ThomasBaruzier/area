import { useContext } from "react";

import { MetadataContext, type MetadataContextType } from "./MetadataContext";

export function useMetadata(): MetadataContextType {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    throw new Error("useMetadata must be used within a MetadataProvider");
  }
  return context;
}
