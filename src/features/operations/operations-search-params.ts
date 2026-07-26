import { z } from "zod";

import type { ShipmentListParams } from "@/domain/contracts";
import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
  type ExceptionType,
  type ShipmentPriority,
  type ShipmentStatus,
} from "@/domain/shipment";

export const PAGE_SIZE = 50;

const searchParamsSchema = z.object({
  search: z.string().trim().min(1).optional(),
  exceptionType: z.enum(EXCEPTION_TYPES).optional(),
  priority: z.enum(SHIPMENT_PRIORITIES).optional(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
  origin: z.string().trim().min(1).optional(),
  assigned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().positive().default(1),
});

export interface OperationsSearchState {
  search?: string;
  exceptionType?: ExceptionType;
  priority?: ShipmentPriority;
  status?: ShipmentStatus;
  origin?: string;
  assigned?: boolean;
  page: number;
}

export function parseOperationsSearchParams(
  searchParams: URLSearchParams,
): OperationsSearchState {
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = searchParamsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const search = searchParamsSchema.shape.search.safeParse(raw.search);

  const exceptionType = searchParamsSchema.shape.exceptionType.safeParse(
    raw.exceptionType,
  );

  const priority = searchParamsSchema.shape.priority.safeParse(raw.priority);

  const status = searchParamsSchema.shape.status.safeParse(raw.status);

  const origin = searchParamsSchema.shape.origin.safeParse(raw.origin);

  const assigned = searchParamsSchema.shape.assigned.safeParse(raw.assigned);

  const page = searchParamsSchema.shape.page.safeParse(raw.page);

  return {
    ...(search.success ? { search: search.data } : {}),
    ...(exceptionType.success ? { exceptionType: exceptionType.data } : {}),
    ...(priority.success ? { priority: priority.data } : {}),
    ...(status.success ? { status: status.data } : {}),
    ...(origin.success ? { origin: origin.data } : {}),
    ...(assigned.success ? { assigned: assigned.data } : {}),
    page: page.success ? page.data : 1,
  };
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
