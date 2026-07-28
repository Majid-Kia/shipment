import type {
  AcknowledgeShipmentRequest,
  AssignShipmentRequest,
} from "@/entities/shipment/api/shipment-contracts";
import { shipmentMutationResponseSchema } from "@/entities/shipment/api/shipment-contracts";
import { shipmentDetailsSchema } from "@/entities/shipment/model/shipment";
import { request } from "@/shared/api/http-client";

type MockMutationRole = "VIEWER" | "OPERATOR";

export function getShipment(id: string, signal?: AbortSignal) {
  return request(`/api/shipments/${id}`, shipmentDetailsSchema, { signal });
}

export function acknowledgeShipment(
  id: string,
  body: AcknowledgeShipmentRequest,
  role: MockMutationRole = "OPERATOR",
) {
  return request(
    `/api/shipments/${id}/acknowledge`,
    shipmentMutationResponseSchema,
    { body, method: "POST", role },
  );
}

export function assignShipment(
  id: string,
  body: AssignShipmentRequest,
  role: MockMutationRole = "OPERATOR",
) {
  return request(
    `/api/shipments/${id}/assign`,
    shipmentMutationResponseSchema,
    { body, method: "POST", role },
  );
}
