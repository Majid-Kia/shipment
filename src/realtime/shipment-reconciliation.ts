import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentListResponse } from "@/domain/contracts";
import type {
  Shipment,
  ShipmentDetails,
  ShipmentRealtimeEvent,
} from "@/domain/shipment";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import type { OptimisticOverlay } from "@/realtime/reconciliation-registry";

export function mergeRealtimeEvent<T extends Shipment>(
  shipment: T,
  event: ShipmentRealtimeEvent,
): T {
  return {
    ...shipment,
    ...event.payload,
    version: event.version,
    updatedAt: event.payload.updatedAt ?? event.timestamp,
  };
}

export function applyEventToCachedShipment(
  queryClient: QueryClient,
  event: ShipmentRealtimeEvent,
  overlay?: OptimisticOverlay,
) {
  let visible = false;
  queryClient.setQueryData<ShipmentDetails>(
    operationsKeys.detail(event.shipmentId),
    (shipment) => {
      if (!shipment) return shipment;
      visible = true;
      return applyOverlay(mergeRealtimeEvent(shipment, event), overlay);
    },
  );
  queryClient.setQueriesData<ShipmentListResponse>(
    { queryKey: operationsKeys.lists() },
    (data) => {
      if (!data) return data;
      const index = data.items.findIndex(({ id }) => id === event.shipmentId);
      if (index < 0) return data;
      visible = true;
      const items = data.items.slice();
      items[index] = applyOverlay(
        mergeRealtimeEvent(items[index]!, event),
        overlay,
      );
      return { ...data, items };
    },
  );
  return visible;
}

function applyOverlay<T extends Shipment>(
  shipment: T,
  overlay?: OptimisticOverlay,
): T {
  return overlay ? { ...shipment, ...overlay } : shipment;
}
