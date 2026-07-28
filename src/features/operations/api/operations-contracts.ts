import { z } from "zod";

import {
  shipmentSchema,
  type ExceptionType,
  type ShipmentPriority,
  type ShipmentStatus,
} from "@/entities/shipment/model/shipment";

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

export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;
export type ShipmentListResponse = z.infer<typeof shipmentListResponseSchema>;
