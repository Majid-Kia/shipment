import { z } from "zod";

import { shipmentDetailsSchema } from "@/entities/shipment/model/shipment";

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

export type AcknowledgeShipmentRequest = z.infer<
  typeof acknowledgeShipmentRequestSchema
>;
export type AssignShipmentRequest = z.infer<typeof assignShipmentRequestSchema>;
export type ShipmentMutationResponse = z.infer<
  typeof shipmentMutationResponseSchema
>;
