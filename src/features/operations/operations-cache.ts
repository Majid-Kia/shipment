import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ShipmentListResponse, ShipmentSummary } from "@/domain/contracts";
import type { Operator } from "@/domain/operator";
import type { Shipment, ShipmentDetails } from "@/domain/shipment";
import { operationsKeys } from "@/features/operations/operations-query-keys";

export interface CacheSnapshot {
  entries: Array<{ queryKey: QueryKey; data: unknown }>;
}

export type OptimisticChange =
  { type: "acknowledge" } | { type: "assign"; operator: Operator };

export async function snapshotAndOptimisticallyUpdate(
  queryClient: QueryClient,
  shipmentId: string,
  change: OptimisticChange,
) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: operationsKeys.shipments() }),
    queryClient.cancelQueries({ queryKey: operationsKeys.detail(shipmentId) }),
  ]);

  const listEntries = queryClient.getQueriesData<ShipmentListResponse>({
    queryKey: operationsKeys.lists(),
  });
  const detailKey = operationsKeys.detail(shipmentId);
  const detail = queryClient.getQueryData<ShipmentDetails>(detailKey);
  const entries: CacheSnapshot["entries"] = listEntries
    .filter((entry): entry is [QueryKey, ShipmentListResponse] =>
      Boolean(entry[1]?.items.some(({ id }) => id === shipmentId)),
    )
    .map(([queryKey, data]) => ({ queryKey, data }));

  if (detail) entries.push({ queryKey: detailKey, data: detail });

  for (const { queryKey, data } of entries) {
    if (isListResponse(data)) {
      queryClient.setQueryData<ShipmentListResponse>(queryKey, {
        ...data,
        items: data.items.map((shipment) =>
          shipment.id === shipmentId
            ? applyOptimisticChange(shipment, change)
            : shipment,
        ),
        summary: updateSummary(
          data.summary,
          data.items.find(({ id }) => id === shipmentId)!,
          change,
        ),
      });
    } else {
      queryClient.setQueryData<ShipmentDetails>(
        queryKey,
        applyOptimisticChange(data as ShipmentDetails, change),
      );
    }
  }

  const base =
    detail ??
    listEntries
      .flatMap(([, data]) => data?.items ?? [])
      .find(({ id }) => id === shipmentId);

  if (!base) throw new Error("Shipment is not available in the query cache.");

  return { snapshot: { entries }, expectedVersion: base.version };
}

export function toOptimisticOverlay(change: OptimisticChange) {
  return change.type === "acknowledge"
    ? ({ status: "ACKNOWLEDGED" as const } as const)
    : ({ assignedTo: change.operator } as const);
}

export function restoreCacheSnapshot(
  queryClient: QueryClient,
  snapshot: CacheSnapshot,
) {
  for (const { queryKey, data } of snapshot.entries) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function reconcileCanonicalShipment(
  queryClient: QueryClient,
  shipment: ShipmentDetails,
) {
  queryClient.setQueryData(operationsKeys.detail(shipment.id), shipment);
  queryClient.setQueriesData<ShipmentListResponse>(
    { queryKey: operationsKeys.lists() },
    (data) =>
      data?.items.some(({ id }) => id === shipment.id)
        ? {
            ...data,
            items: data.items.map((item) =>
              item.id === shipment.id ? toShipment(shipment) : item,
            ),
          }
        : data,
  );
}

function applyOptimisticChange<T extends Shipment>(
  shipment: T,
  change: OptimisticChange,
): T {
  return {
    ...shipment,
    ...(change.type === "acknowledge"
      ? { status: "ACKNOWLEDGED" as const }
      : { assignedTo: change.operator }),
  };
}

function updateSummary(
  summary: ShipmentSummary,
  shipment: Shipment,
  change: OptimisticChange,
) {
  if (change.type === "acknowledge") {
    return {
      ...summary,
      acknowledgedExceptions:
        summary.acknowledgedExceptions +
        (shipment.status === "ACKNOWLEDGED" ? 0 : 1),
    };
  }

  return {
    ...summary,
    unassignedShipments:
      summary.unassignedShipments - (shipment.assignedTo === null ? 1 : 0),
  };
}

function isListResponse(data: unknown): data is ShipmentListResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "items" in data &&
    Array.isArray(data.items)
  );
}

function toShipment(details: ShipmentDetails): Shipment {
  const {
    exception: _exception,
    recentEvents: _recentEvents,
    statusHistory: _statusHistory,
    ...shipment
  } = details;
  return shipment;
}
