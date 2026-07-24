import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentListResponse } from "@/domain/contracts";
import { shipmentRealtimeEventSchema } from "@/domain/schemas";
import type {
  Shipment,
  ShipmentDetails,
  ShipmentRealtimeEvent,
} from "@/domain/shipment";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { ReconciliationRegistry } from "@/realtime/reconciliation-registry";

export type ReconciliationResult =
  | { accepted: true; visible: boolean; event: ShipmentRealtimeEvent }
  | { accepted: false; reason: "invalid" | "duplicate" | "stale" };

export function reconcileShipmentEvent(
  rawEvent: unknown,
  queryClient: QueryClient,
  registry: ReconciliationRegistry,
): ReconciliationResult {
  const parsed = shipmentRealtimeEventSchema.safeParse(rawEvent);
  if (!parsed.success) {
    if (import.meta.env.DEV) console.warn("Ignored invalid realtime event.");
    return { accepted: false, reason: "invalid" };
  }

  const event = parsed.data;
  if (registry.hasEvent(event.eventId)) {
    return { accepted: false, reason: "duplicate" };
  }
  registry.recordEvent(event.eventId);

  const cachedVersion = findHighestCachedVersion(queryClient, event.shipmentId);
  const confirmedVersion = Math.max(
    registry.getConfirmedVersion(event.shipmentId) ?? 0,
    cachedVersion ?? 0,
  );
  if (event.version <= confirmedVersion) {
    return { accepted: false, reason: "stale" };
  }

  registry.recordConfirmedVersion(event.shipmentId, event.version);
  let visible = false;

  queryClient.setQueryData<ShipmentDetails>(
    operationsKeys.detail(event.shipmentId),
    (shipment) => {
      if (!shipment) return shipment;
      visible = true;
      return applyEvent(shipment, event);
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
      items[index] = applyEvent(items[index]!, event);
      return { ...data, items };
    },
  );

  return { accepted: true, visible, event };
}

function applyEvent<T extends Shipment>(
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
