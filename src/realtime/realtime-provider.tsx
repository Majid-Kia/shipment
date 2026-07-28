import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  RealtimeConnectionState,
  ShipmentEventSource,
} from "@/realtime/contracts";
import { getReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { reconcileShipmentEvent } from "@/realtime/reconcile-shipment-event";
import type { ShipmentRealtimeCache } from "@/realtime/shipment-cache";

const RealtimeStateContext =
  createContext<RealtimeConnectionState>("disconnected");

export function useRealtimeConnectionState() {
  return useContext(RealtimeStateContext);
}

export function RealtimeProvider({
  children,
  cache,
  source,
}: {
  children: ReactNode;
  cache: ShipmentRealtimeCache;
  source: ShipmentEventSource;
}) {
  const queryClient = useQueryClient();
  const registry = getReconciliationRegistry(queryClient);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>(source.getConnectionState());

  useEffect(() => {
    let invalidationTimer: ReturnType<typeof setTimeout> | undefined;
    let previousState = source.getConnectionState();
    const unsubscribeEvents = source.subscribe((event) => {
      const result = reconcileShipmentEvent(event, cache, registry);
      if (result.accepted && !invalidationTimer) {
        invalidationTimer = setTimeout(() => {
          cache.invalidateLists();
          invalidationTimer = undefined;
        }, 250);
      }
    });
    const unsubscribeConnection = source.subscribeToConnection((state) => {
      setConnectionState(state);
      if (state === "connected" && previousState === "disconnected") {
        cache.invalidateLists();
        cache.invalidateObservedDetails();
      }
      previousState = state;
    });

    source.connect();
    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
      if (invalidationTimer) clearTimeout(invalidationTimer);
      source.disconnect();
    };
  }, [cache, queryClient, registry, source]);

  return (
    <RealtimeStateContext value={connectionState}>
      {children}
    </RealtimeStateContext>
  );
}
