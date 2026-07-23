import type { Operator } from "@/domain/operator";

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

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export type ShipmentPriority = (typeof SHIPMENT_PRIORITIES)[number];
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export interface Shipment {
  id: string;
  shipmentNumber: string;
  originPort: string;
  destinationPort: string;
  eta: string;
  exceptionType: ExceptionType;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  assignedTo: Operator | null;
  version: number;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  from: ShipmentStatus | null;
  to: ShipmentStatus;
  at: string;
  actor: string;
}

export type ShipmentEventType =
  "SHIPMENT_UPDATED" | "SHIPMENT_ACKNOWLEDGED" | "SHIPMENT_ASSIGNED";

export interface ShipmentEventRecord {
  eventId: string;
  type: ShipmentEventType;
  timestamp: string;
  summary: string;
  version: number;
}

export interface ShipmentDetails extends Shipment {
  exception: {
    description: string;
    detectedAt: string;
  };
  statusHistory: StatusHistoryEntry[];
  recentEvents: ShipmentEventRecord[];
}
