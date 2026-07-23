import type { ShipmentListParams } from "@/domain/contracts";

export const operationsKeys = {
  all: ["operations"] as const,
  shipments: () => [...operationsKeys.all, "shipments"] as const,
  list: (params: ShipmentListParams) =>
    [
      ...operationsKeys.shipments(),
      "list",
      normalizeListParams(params),
    ] as const,
  details: () => [...operationsKeys.shipments(), "detail"] as const,
  detail: (id: string) => [...operationsKeys.details(), id] as const,
  operators: () => [...operationsKeys.all, "operators"] as const,
};

function normalizeListParams(params: ShipmentListParams): ShipmentListParams {
  return {
    page: params.page,
    pageSize: params.pageSize,
    ...(params.search ? { search: params.search.trim() } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.priority ? { priority: params.priority } : {}),
    ...(params.exceptionType ? { exceptionType: params.exceptionType } : {}),
    ...(params.originPort ? { originPort: params.originPort } : {}),
    ...(params.assigned === undefined ? {} : { assigned: params.assigned }),
  };
}
