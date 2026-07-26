import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentListResponse } from "@/domain/contracts";
import { shipmentRealtimeEventSchema } from "@/domain/schemas";
import type { ShipmentDetails, ShipmentRealtimeEvent } from "@/domain/shipment";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { ReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { applyEventToCachedShipment } from "@/realtime/shipment-reconciliation";

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
  const pending = registry.getPendingMutation(event.shipmentId);
  if (pending) registry.recordPendingEvent(event);
  const visible = applyEventToCachedShipment(
    queryClient,
    event,
    pending?.overlay,
  );

  return { accepted: true, visible, event };
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
