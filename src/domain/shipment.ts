import { z } from "zod";

export const SHIPMENT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export const SHIPMENT_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export const EXCEPTION_TYPES = [
  "DELAYED",
  "CUSTOMS_HOLD",
  "DOCUMENT_MISSING",
  "CONTAINER_NOT_ASSIGNED",
  "PORT_CONGESTION",
] as const;
export const PORT_CODES = [
  "IRBND",
  "CNSHA",
  "NLRTM",
  "SGSIN",
  "AEJEA",
  "DEHAM",
  "USLAX",
  "BRSSZ",
] as const;
export const SHIPMENT_EVENT_TYPES = [
  "SHIPMENT_UPDATED",
  "SHIPMENT_ACKNOWLEDGED",
  "SHIPMENT_ASSIGNED",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type ShipmentPriority = (typeof SHIPMENT_PRIORITIES)[number];
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];
export type ShipmentEventType = (typeof SHIPMENT_EVENT_TYPES)[number];

export const operatorSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const shipmentSchema = z.strictObject({
  id: z.string().min(1),
  shipmentNumber: z.string().min(1),
  originPort: z.string().min(1),
  destinationPort: z.string().min(1),
  eta: z.iso.datetime(),
  exceptionType: z.enum(EXCEPTION_TYPES),
  priority: z.enum(SHIPMENT_PRIORITIES),
  status: z.enum(SHIPMENT_STATUSES),
  assignedTo: operatorSchema.nullable(),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export const statusHistoryEntrySchema = z.strictObject({
  id: z.string().min(1),
  from: z.enum(SHIPMENT_STATUSES).nullable(),
  to: z.enum(SHIPMENT_STATUSES),
  at: z.iso.datetime(),
  actor: z.string().min(1),
});

export const shipmentEventRecordSchema = z.strictObject({
  eventId: z.string().min(1),
  type: z.enum(SHIPMENT_EVENT_TYPES),
  timestamp: z.iso.datetime(),
  summary: z.string().min(1),
  version: z.number().int().positive(),
});

export const shipmentDetailsSchema = shipmentSchema.extend({
  exception: z.strictObject({
    description: z.string().min(1),
    detectedAt: z.iso.datetime(),
  }),
  statusHistory: z.array(statusHistoryEntrySchema),
  recentEvents: z.array(shipmentEventRecordSchema).max(5),
});

export type Operator = z.infer<typeof operatorSchema>;
export type Shipment = z.infer<typeof shipmentSchema>;
export type StatusHistoryEntry = z.infer<typeof statusHistoryEntrySchema>;
export type ShipmentEventRecord = z.infer<typeof shipmentEventRecordSchema>;
export type ShipmentDetails = z.infer<typeof shipmentDetailsSchema>;

export function toShipment(details: ShipmentDetails): Shipment {
  const {
    exception: _exception,
    recentEvents: _recentEvents,
    statusHistory: _statusHistory,
    ...shipment
  } = details;
  return shipment;
}
