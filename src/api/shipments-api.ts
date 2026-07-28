import type {
  AcknowledgeShipmentRequest,
  AssignShipmentRequest,
  ShipmentListParams,
} from "@/api/shipment-contracts";
import type { UserRole } from "@/auth/permissions";
import {
  operatorsResponseSchema,
  shipmentListResponseSchema,
  shipmentMutationResponseSchema,
} from "@/api/shipment-contracts";
import { request } from "@/api/http-client";
import { shipmentDetailsSchema } from "@/domain/shipment";

function toSearchParams(params: ShipmentListParams) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && key !== "pageSize" && value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams;
}

export function getShipments(params: ShipmentListParams, signal?: AbortSignal) {
  return request(
    `/api/shipments?${toSearchParams(params).toString()}`,
    shipmentListResponseSchema,
    { signal },
  );
}

export function getShipment(id: string, signal?: AbortSignal) {
  return request(`/api/shipments/${id}`, shipmentDetailsSchema, { signal });
}

export function getOperators(signal?: AbortSignal) {
  return request("/api/operators", operatorsResponseSchema, { signal });
}

export function acknowledgeShipment(
  id: string,
  body: AcknowledgeShipmentRequest,
  role: UserRole = "OPERATOR",
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
  role: UserRole = "OPERATOR",
) {
  return request(
    `/api/shipments/${id}/assign`,
    shipmentMutationResponseSchema,
    { body, method: "POST", role },
  );
}
