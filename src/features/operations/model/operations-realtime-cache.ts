import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentDetails } from "@/entities/shipment/model/shipment";
import type { ShipmentListResponse } from "@/features/operations/api/operations-contracts";
import { operationsKeys } from "@/features/operations/model/operations-query-keys";
import type { ShipmentRealtimeEvent } from "@/realtime/contracts";
import type { OptimisticOverlay } from "@/realtime/reconciliation-registry";
import type { ShipmentRealtimeCache } from "@/realtime/shipment-cache";
import { mergeRealtimeEvent } from "@/realtime/shipment-reconciliation";

export function createOperationsRealtimeCache(
  queryClient: QueryClient,
): ShipmentRealtimeCache {
  return {
    applyEvent(event, overlay) {
      applyEventToCachedShipment(queryClient, event, overlay);
    },
    findHighestVersion(shipmentId) {
      return findHighestCachedVersion(queryClient, shipmentId);
    },
    invalidateLists() {
      void queryClient.invalidateQueries({
        queryKey: operationsKeys.lists(),
      });
    },
    invalidateObservedDetails() {
      void queryClient.invalidateQueries({
        queryKey: operationsKeys.details(),
        predicate: (query) => query.getObserversCount() > 0,
      });
    },
  };
}

export function applyEventToCachedShipment(
  queryClient: QueryClient,
  event: ShipmentRealtimeEvent,
  overlay?: OptimisticOverlay,
) {
  queryClient.setQueryData<ShipmentDetails>(
    operationsKeys.detail(event.shipmentId),
    (shipment) => {
      if (!shipment) return shipment;
      return applyOverlay(mergeRealtimeEvent(shipment, event), overlay);
    },
  );
  queryClient.setQueriesData<ShipmentListResponse>(
    { queryKey: operationsKeys.lists() },
    (data) => {
      if (!data) return data;
      const index = data.items.findIndex(({ id }) => id === event.shipmentId);
      if (index < 0) return data;
      const items = data.items.slice();
      items[index] = applyOverlay(
        mergeRealtimeEvent(items[index]!, event),
        overlay,
      );
      return { ...data, items };
    },
  );
}

function findHighestCachedVersion(
  queryClient: QueryClient,
  shipmentId: string,
) {
  let version =
    queryClient.getQueryData<ShipmentDetails>(operationsKeys.detail(shipmentId))
      ?.version ?? 0;

  for (const [, data] of queryClient.getQueriesData<ShipmentListResponse>({
    queryKey: operationsKeys.lists(),
  })) {
    version = Math.max(
      version,
      data?.items.find(({ id }) => id === shipmentId)?.version ?? 0,
    );
  }
  return version || undefined;
}

function applyOverlay<
  T extends ShipmentDetails | ShipmentListResponse["items"][number],
>(shipment: T, overlay?: OptimisticOverlay): T {
  return overlay ? { ...shipment, ...overlay } : shipment;
}
