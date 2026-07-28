import type { ShipmentRealtimeEvent } from "@/realtime/contracts";
import type { OptimisticOverlay } from "@/realtime/reconciliation-registry";

export interface ShipmentRealtimeCache {
  applyEvent(event: ShipmentRealtimeEvent, overlay?: OptimisticOverlay): void;
  findHighestVersion(shipmentId: string): number | undefined;
  invalidateLists(): void;
  invalidateObservedDetails(): void;
}
