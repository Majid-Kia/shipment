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

  const valid: Record<string, string> = {};
  for (const key of [
    "search",
    "exceptionType",
    "priority",
    "status",
    "origin",
    "assigned",
    "page",
  ]) {
    const value = searchParams.get(key);
    if (value !== null) valid[key] = value;
  }

  const fieldByField = searchParamsSchema.safeParse(valid);
  if (fieldByField.success) return fieldByField.data;

  return {
    ...(searchParamsSchema.shape.search.safeParse(raw.search).success
      ? { search: raw.search?.trim() || undefined }
      : {}),
    ...(searchParamsSchema.shape.exceptionType.safeParse(raw.exceptionType)
      .success
      ? {
          exceptionType:
            raw.exceptionType as OperationsSearchState["exceptionType"],
        }
      : {}),
    ...(searchParamsSchema.shape.priority.safeParse(raw.priority).success
      ? { priority: raw.priority as OperationsSearchState["priority"] }
      : {}),
    ...(searchParamsSchema.shape.status.safeParse(raw.status).success
      ? { status: raw.status as OperationsSearchState["status"] }
      : {}),
    ...(searchParamsSchema.shape.origin.safeParse(raw.origin).success
      ? { origin: raw.origin?.trim() || undefined }
      : {}),
    ...(raw.assigned === "true"
      ? { assigned: true }
      : raw.assigned === "false"
        ? { assigned: false }
        : {}),
    page:
      typeof raw.page === "string" &&
      /^\d+$/.test(raw.page) &&
      Number(raw.page) > 0
        ? Number(raw.page)
        : 1,
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
