import { z } from "zod";

import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
  operatorSchema,
} from "@/domain/shipment";

export const shipmentRealtimeEventSchema = z.strictObject({
  eventId: z.string().min(1),
  shipmentId: z.string().min(1),
  version: z.number().int().positive(),
  type: z.literal("SHIPMENT_UPDATED"),
  timestamp: z.iso.datetime(),
  payload: z
    .strictObject({
      eta: z.iso.datetime().optional(),
      exceptionType: z.enum(EXCEPTION_TYPES).optional(),
      priority: z.enum(SHIPMENT_PRIORITIES).optional(),
      status: z.enum(SHIPMENT_STATUSES).optional(),
      assignedTo: operatorSchema.nullable().optional(),
      updatedAt: z.iso.datetime().optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "A realtime event payload must contain at least one field.",
    }),
});

export type ShipmentRealtimeEvent = z.infer<typeof shipmentRealtimeEventSchema>;

export type RealtimeConnectionState =
  "disconnected" | "connecting" | "connected";

export interface ShipmentEventSource {
  connect(): void;
  disconnect(): void;
  subscribe(listener: (event: unknown) => void): () => void;
  subscribeToConnection(
    listener: (state: RealtimeConnectionState) => void,
  ): () => void;
  getConnectionState(): RealtimeConnectionState;
}
