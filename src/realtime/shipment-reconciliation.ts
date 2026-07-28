import type { Shipment } from "@/entities/shipment/model/shipment";
import type { ShipmentRealtimeEvent } from "@/realtime/contracts";

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
