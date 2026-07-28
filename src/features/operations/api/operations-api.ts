import {
  shipmentListResponseSchema,
  type ShipmentListParams,
} from "@/features/operations/api/operations-contracts";
import { request } from "@/shared/api/http-client";

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
