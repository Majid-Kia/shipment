import { z } from "zod";

import {
  operatorSchema,
  shipmentDetailsSchema,
  shipmentSchema,
  type ExceptionType,
  type ShipmentPriority,
  type ShipmentStatus,
} from "@/domain/shipment";

export interface ShipmentListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: ShipmentStatus;
  priority?: ShipmentPriority;
  exceptionType?: ExceptionType;
  originPort?: string;
  assigned?: boolean;
}

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

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "FORBIDDEN",
  "INVALID_STATE",
  "VERSION_CONFLICT",
  "SERVICE_UNAVAILABLE",
  "UNKNOWN",
]);

export const apiErrorBodySchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.string()).optional(),
  }),
});

export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;
export type ShipmentListResponse = z.infer<typeof shipmentListResponseSchema>;
export type OperatorsResponse = z.infer<typeof operatorsResponseSchema>;
export type AcknowledgeShipmentRequest = z.infer<
  typeof acknowledgeShipmentRequestSchema
>;
export type AssignShipmentRequest = z.infer<typeof assignShipmentRequestSchema>;
export type ShipmentMutationResponse = z.infer<
  typeof shipmentMutationResponseSchema
>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
