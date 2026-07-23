import { z } from "zod";

import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
} from "@/domain/shipment";

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
  type: z.enum([
    "SHIPMENT_UPDATED",
    "SHIPMENT_ACKNOWLEDGED",
    "SHIPMENT_ASSIGNED",
  ]),
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

export const shipmentSummarySchema = z.strictObject({
  totalExceptions: z.number().int().nonnegative(),
  criticalExceptions: z.number().int().nonnegative(),
  unassignedShipments: z.number().int().nonnegative(),
  acknowledgedExceptions: z.number().int().nonnegative(),
});

export const shipmentListResponseSchema = z.strictObject({
  items: z.array(shipmentSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  summary: shipmentSummarySchema,
});

export const operatorsResponseSchema = z.strictObject({
  items: z.array(operatorSchema),
});

export const acknowledgeShipmentRequestSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
});

export const assignShipmentRequestSchema = z.strictObject({
  operatorId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
});

export const shipmentMutationResponseSchema = z.strictObject({
  shipment: shipmentDetailsSchema,
});

export const apiErrorBodySchema = z.strictObject({
  error: z.strictObject({
    code: z.enum([
      "BAD_REQUEST",
      "NOT_FOUND",
      "FORBIDDEN",
      "INVALID_STATE",
      "VERSION_CONFLICT",
      "SERVICE_UNAVAILABLE",
      "UNKNOWN",
    ]),
    message: z.string().min(1),
    requestId: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.string()).optional(),
  }),
});
