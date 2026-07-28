import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { ShipmentListResponse } from "@/api/shipment-contracts";
import type { Shipment, ShipmentDetails } from "@/domain/shipment";
import { snapshotAndOptimisticallyUpdate } from "@/features/operations/operations-cache";
import {
  reconcileMutationFailure,
  reconcileMutationSuccess,
} from "@/features/operations/mutation-reconciliation";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { shipmentRepository } from "@/mocks/database";
import type { ShipmentRealtimeEvent } from "@/realtime/contracts";
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
): { detail: ShipmentDetails; listItem: Shipment } {
  const detail = queryClient.getQueryData<ShipmentDetails>(
    operationsKeys.detail(shipmentId),
  )!;
  const listItem = queryClient
    .getQueryData<ShipmentListResponse>(operationsKeys.list(params))!
    .items.find(({ id }) => id === shipmentId)!;
  return { detail, listItem };
}

function newerEvent(
  detail: ShipmentDetails,
  version: number,
  payload: ShipmentRealtimeEvent["payload"] = { priority: "CRITICAL" },
): ShipmentRealtimeEvent {
  return {
    eventId: `${detail.id}-race-v${version}`,
    shipmentId: detail.id,
    version,
    type: "SHIPMENT_UPDATED",
    timestamp: "2026-07-24T14:00:00.000Z",
    payload,
  };
}

describe("mutation/realtime reconciliation", () => {
  it("replays newer realtime events over a delayed stale mutation response", async () => {
    const { queryClient, registry, detail } = setup();
    const untouchedRow = queryClient
      .getQueryData<ShipmentListResponse>(operationsKeys.list(params))!
      .items.find(({ id }) => id !== detail.id);
    const change = { type: "acknowledge" as const };
    const { baseVersion, optimisticOverlay } =
      await snapshotAndOptimisticallyUpdate(queryClient, detail.id, change);
    registry.beginMutation(detail.id, baseVersion, optimisticOverlay);

    expect(getCached(queryClient, detail.id).detail).toMatchObject({
      status: "ACKNOWLEDGED",
      version: detail.version,
    });
    expect(
      queryClient
        .getQueryData<ShipmentListResponse>(operationsKeys.list(params))!
        .items.find(({ id }) => id === untouchedRow?.id),
    ).toBe(untouchedRow);

    reconcileShipmentEvent(
      newerEvent(detail, detail.version + 2),
      queryClient,
      registry,
    );
    const newerEta = "2026-07-25T14:00:00.000Z";
    reconcileShipmentEvent(
      newerEvent(detail, detail.version + 3, { eta: newerEta }),
      queryClient,
      registry,
    );
    expect(getCached(queryClient, detail.id).detail).toMatchObject({
      status: "ACKNOWLEDGED",
      priority: "CRITICAL",
      eta: newerEta,
      version: detail.version + 3,
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
      eta: newerEta,
      version: detail.version + 3,
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
    const { rollbackSnapshot, baseVersion, optimisticOverlay } =
      await snapshotAndOptimisticallyUpdate(queryClient, detail.id, change);
    registry.beginMutation(detail.id, baseVersion, optimisticOverlay);

    const event = newerEvent(detail, detail.version + 1);
    reconcileShipmentEvent(event, queryClient, registry);
    expect(getCached(queryClient, detail.id).detail.status).toBe(
      "ACKNOWLEDGED",
    );

    reconcileMutationFailure(
      queryClient,
      registry,
      detail.id,
      rollbackSnapshot,
    );

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

  it("allows only one pending mutation per shipment", () => {
    const { registry, detail } = setup();
    registry.beginMutation(detail.id, detail.version, {
      status: "ACKNOWLEDGED",
    });

    expect(() =>
      registry.beginMutation(detail.id, detail.version, {
        assignedTo: { id: "OP-03", name: "Operator 03" },
      }),
    ).toThrow("A mutation is already pending for this shipment.");
    expect(registry.getPendingMutation(detail.id)).toMatchObject({
      baseVersion: detail.version,
      overlay: { status: "ACKNOWLEDGED" },
    });
  });
});
