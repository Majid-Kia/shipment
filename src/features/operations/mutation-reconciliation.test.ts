import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { ShipmentListResponse } from "@/domain/contracts";
import type { ShipmentDetails, ShipmentRealtimeEvent } from "@/domain/shipment";
import {
  snapshotAndOptimisticallyUpdate,
  toOptimisticOverlay,
} from "@/features/operations/operations-cache";
import {
  reconcileMutationFailure,
  reconcileMutationSuccess,
} from "@/features/operations/mutation-reconciliation";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { shipmentRepository } from "@/mocks/database";
import { ReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { reconcileShipmentEvent } from "@/realtime/reconcile-shipment-event";

const params = { page: 1, pageSize: 50 };

function setup() {
  const queryClient = new QueryClient();
  const registry = new ReconciliationRegistry();
  const detail = shipmentRepository.get("SHP-100000")!;
  const list = shipmentRepository.list(params);
  queryClient.setQueryData(operationsKeys.detail(detail.id), detail);
  queryClient.setQueryData(operationsKeys.list(params), list);
  return { queryClient, registry, detail };
}

function getCached(
  queryClient: QueryClient,
  shipmentId: string,
): { detail: ShipmentDetails; listItem: ShipmentDetails } {
  const detail = queryClient.getQueryData<ShipmentDetails>(
    operationsKeys.detail(shipmentId),
  )!;
  const listItem = queryClient
    .getQueryData<ShipmentListResponse>(operationsKeys.list(params))!
    .items.find(({ id }) => id === shipmentId)! as ShipmentDetails;
  return { detail, listItem };
}

function newerEvent(
  detail: ShipmentDetails,
  version: number,
): ShipmentRealtimeEvent {
  return {
    eventId: `${detail.id}-race-v${version}`,
    shipmentId: detail.id,
    version,
    type: "SHIPMENT_UPDATED",
    timestamp: "2026-07-24T14:00:00.000Z",
    payload: { priority: "CRITICAL" },
  };
}

describe("mutation/realtime reconciliation", () => {
  it("keeps a newer realtime event after a pending mutation succeeds", async () => {
    const { queryClient, registry, detail } = setup();
    const change = { type: "acknowledge" as const };
    const { snapshot: _snapshot, expectedVersion } =
      await snapshotAndOptimisticallyUpdate(queryClient, detail.id, change);
    registry.beginMutation(
      detail.id,
      expectedVersion,
      toOptimisticOverlay(change),
    );

    expect(getCached(queryClient, detail.id).detail).toMatchObject({
      status: "ACKNOWLEDGED",
      version: detail.version,
    });

    const event = newerEvent(detail, detail.version + 2);
    reconcileShipmentEvent(event, queryClient, registry);
    expect(getCached(queryClient, detail.id).detail).toMatchObject({
      status: "ACKNOWLEDGED",
      priority: "CRITICAL",
      version: detail.version + 2,
    });

    const response: ShipmentDetails = {
      ...detail,
      status: "ACKNOWLEDGED",
      version: detail.version + 1,
      updatedAt: "2026-07-24T13:00:00.000Z",
    };
    reconcileMutationSuccess(queryClient, registry, response);

    const finalCache = getCached(queryClient, detail.id);
    expect(finalCache.detail).toMatchObject({
      status: "ACKNOWLEDGED",
      priority: "CRITICAL",
      version: detail.version + 2,
    });
    expect(finalCache.listItem).toMatchObject({
      status: finalCache.detail.status,
      priority: finalCache.detail.priority,
      version: finalCache.detail.version,
      updatedAt: finalCache.detail.updatedAt,
    });
    expect(registry.getPendingMutation(detail.id)).toBeUndefined();
  });

  it("rolls back the overlay but reapplies newer realtime truth on failure", async () => {
    const { queryClient, registry, detail } = setup();
    const change = { type: "acknowledge" as const };
    const { snapshot, expectedVersion } = await snapshotAndOptimisticallyUpdate(
      queryClient,
      detail.id,
      change,
    );
    registry.beginMutation(
      detail.id,
      expectedVersion,
      toOptimisticOverlay(change),
    );

    const event = newerEvent(detail, detail.version + 1);
    reconcileShipmentEvent(event, queryClient, registry);
    expect(getCached(queryClient, detail.id).detail.status).toBe(
      "ACKNOWLEDGED",
    );

    reconcileMutationFailure(queryClient, registry, detail.id, snapshot);

    const finalCache = getCached(queryClient, detail.id);
    expect(finalCache.detail).toMatchObject({
      status: detail.status,
      priority: "CRITICAL",
      version: detail.version + 1,
    });
    expect(finalCache.listItem).toMatchObject({
      status: finalCache.detail.status,
      priority: finalCache.detail.priority,
      version: finalCache.detail.version,
      updatedAt: finalCache.detail.updatedAt,
    });
    expect(registry.getPendingMutation(detail.id)).toBeUndefined();
  });
});
