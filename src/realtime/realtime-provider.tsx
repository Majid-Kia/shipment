import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";

import { operationsKeys } from "@/features/operations/operations-query-keys";
import { RealtimeStateContext } from "@/realtime/realtime-context";
import { getReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { reconcileShipmentEvent } from "@/realtime/reconcile-shipment-event";
import {
  MockShipmentEventSource,
  type RealtimeConnectionState,
  type ShipmentEventSource,
} from "@/realtime/shipment-event-source";

const defaultSource = new MockShipmentEventSource();

export function RealtimeProvider({
  children,
  source = defaultSource,
}: {
  children: ReactNode;
  source?: ShipmentEventSource;
}) {
  const queryClient = useQueryClient();
  const registry = getReconciliationRegistry(queryClient);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>(source.getConnectionState());

  useEffect(() => {
    let invalidationTimer: ReturnType<typeof setTimeout> | undefined;
    let previousState = source.getConnectionState();
    const unsubscribeEvents = source.subscribe((event) => {
      const result = reconcileShipmentEvent(event, queryClient, registry);
      if (result.accepted && !invalidationTimer) {
        invalidationTimer = setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: operationsKeys.lists(),
          });
          invalidationTimer = undefined;
        }, 250);
      }
    });
    const unsubscribeConnection = source.subscribeToConnection((state) => {
      setConnectionState(state);
      if (state === "connected" && previousState === "disconnected") {
        void queryClient.invalidateQueries({
          queryKey: operationsKeys.lists(),
        });
        void queryClient.invalidateQueries({
          queryKey: operationsKeys.details(),
          predicate: (query) => query.getObserversCount() > 0,
        });
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
  }, [queryClient, registry, source]);

  return (
    <RealtimeStateContext value={connectionState}>
      {children}
    </RealtimeStateContext>
  );
}
