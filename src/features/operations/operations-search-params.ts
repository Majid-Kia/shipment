import { z } from "zod";

import type { ShipmentListParams } from "@/api/shipment-contracts";
import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
} from "@/domain/shipment";

export const PAGE_SIZE = 50;

const searchParamsSchema = z.object({
  search: z.string().trim().min(1).optional().catch(undefined),
  exceptionType: z.enum(EXCEPTION_TYPES).optional().catch(undefined),
  priority: z.enum(SHIPMENT_PRIORITIES).optional().catch(undefined),
  status: z.enum(SHIPMENT_STATUSES).optional().catch(undefined),
  origin: z.string().trim().min(1).optional().catch(undefined),
  assigned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().positive().default(1).catch(1),
});

export type OperationsSearchState = z.infer<typeof searchParamsSchema>;

export function parseOperationsSearchParams(
  searchParams: URLSearchParams,
): OperationsSearchState {
  return searchParamsSchema.parse(Object.fromEntries(searchParams.entries()));
}
export function serializeOperationsSearchState(state: OperationsSearchState) {
  const searchParams = new URLSearchParams();
  if (state.search) searchParams.set("search", state.search.trim());
  if (state.exceptionType)
    searchParams.set("exceptionType", state.exceptionType);
  if (state.priority) searchParams.set("priority", state.priority);
  if (state.status) searchParams.set("status", state.status);
  if (state.origin) searchParams.set("origin", state.origin);
  if (state.assigned !== undefined)
    searchParams.set("assigned", String(state.assigned));
  if (state.page !== 1) searchParams.set("page", String(state.page));
  return searchParams;
}

export function toShipmentListParams(
  state: OperationsSearchState,
): ShipmentListParams {
  return {
    page: state.page,
    pageSize: PAGE_SIZE,
    ...(state.search ? { search: state.search } : {}),
    ...(state.exceptionType ? { exceptionType: state.exceptionType } : {}),
    ...(state.priority ? { priority: state.priority } : {}),
    ...(state.status ? { status: state.status } : {}),
    ...(state.origin ? { originPort: state.origin } : {}),
    ...(state.assigned === undefined ? {} : { assigned: state.assigned }),
  };
}
