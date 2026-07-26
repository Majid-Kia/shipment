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
  response: ShipmentDetails,
) {
  const pending = registry.finishMutation(response.id);
  const finalShipment = (pending?.events ?? [])
    .filter((event) => event.version > response.version)
    .reduce<ShipmentDetails>(mergeRealtimeEvent, response);

  registry.recordConfirmedVersion(response.id, finalShipment.version);
  reconcileCanonicalShipment(queryClient, finalShipment);
  return finalShipment;
}

export function reconcileMutationFailure(
  queryClient: QueryClient,
  registry: ReconciliationRegistry,
  shipmentId: string,
  snapshot: CacheSnapshot,
) {
  const pending = registry.finishMutation(shipmentId);
  restoreCacheSnapshot(queryClient, snapshot);
  for (const event of pending?.events ?? []) {
    if (event.version > pending!.baseVersion) {
      applyEventToCachedShipment(queryClient, event);
    }
  }
}
