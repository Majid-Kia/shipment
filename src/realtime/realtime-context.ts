import { createContext, useContext } from "react";

import type { RealtimeConnectionState } from "@/realtime/shipment-event-source";

export const RealtimeStateContext =
  createContext<RealtimeConnectionState>("disconnected");

export function useRealtimeConnectionState() {
  return useContext(RealtimeStateContext);
}
