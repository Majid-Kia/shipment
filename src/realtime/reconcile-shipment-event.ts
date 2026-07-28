import { shipmentRealtimeEventSchema } from "@/realtime/contracts";
import { ReconciliationRegistry } from "@/realtime/reconciliation-registry";
import type { ShipmentRealtimeCache } from "@/realtime/shipment-cache";

export type ReconciliationResult =
  | { accepted: true }
  | { accepted: false; reason: "invalid" | "duplicate" | "stale" };

export function reconcileShipmentEvent(
  rawEvent: unknown,
  cache: ShipmentRealtimeCache,
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

  const cachedVersion = cache.findHighestVersion(event.shipmentId);
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
  cache.applyEvent(event, pending?.overlay);

  return { accepted: true };
}
