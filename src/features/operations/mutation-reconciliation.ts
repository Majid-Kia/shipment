import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentDetails } from "@/domain/shipment";
import {
  reconcileCanonicalShipment,
  restoreCacheSnapshot,
  type CacheSnapshot,
} from "@/features/operations/operations-cache";
import type { ReconciliationRegistry } from "@/realtime/reconciliation-registry";
import {
  applyEventToCachedShipment,
  mergeRealtimeEvent,
} from "@/realtime/shipment-reconciliation";

export function reconcileMutationSuccess(
  queryClient: QueryClient,
  registry: ReconciliationRegistry,
  canonicalShipment: ShipmentDetails,
) {
  const pendingMutation = registry.finishMutation(canonicalShipment.id);
  const newerEvents = (pendingMutation?.events ?? []).filter(
    (event) => event.version > canonicalShipment.version,
  );
  const renderedShipment = newerEvents.reduce<ShipmentDetails>(
    mergeRealtimeEvent,
    canonicalShipment,
  );

  registry.recordConfirmedVersion(
    canonicalShipment.id,
    renderedShipment.version,
  );
  reconcileCanonicalShipment(queryClient, renderedShipment);
  return renderedShipment;
}

export function reconcileMutationFailure(
  queryClient: QueryClient,
  registry: ReconciliationRegistry,
  shipmentId: string,
  rollbackSnapshot: CacheSnapshot,
) {
  const pendingMutation = registry.finishMutation(shipmentId);
  restoreCacheSnapshot(queryClient, rollbackSnapshot);
  if (!pendingMutation) return;

  const newerEvents = pendingMutation.events.filter(
    (event) => event.version > pendingMutation.baseVersion,
  );
  for (const event of newerEvents) {
    applyEventToCachedShipment(queryClient, event);
  }
}
