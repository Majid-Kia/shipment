import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import type { ShipmentListResponse } from "@/domain/contracts";
import type { Shipment, ShipmentRealtimeEvent } from "@/domain/shipment";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { ReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { reconcileShipmentEvent } from "@/realtime/reconcile-shipment-event";

const listParams = { page: 1, pageSize: 50 };
const shipment: Shipment = {
  id: "shipment-1",
  shipmentNumber: "SHP-1",
  originPort: "Tehran",
  destinationPort: "Dubai",
  eta: "2026-07-25T10:00:00.000Z",
  exceptionType: "DELAYED",
  priority: "HIGH",
  status: "OPEN",
  assignedTo: null,
  version: 17,
  updatedAt: "2026-07-24T10:00:00.000Z",
};
const untouched: Shipment = { ...shipment, id: "shipment-2" };

function event(
  overrides: Partial<ShipmentRealtimeEvent> = {},
): ShipmentRealtimeEvent {
  return {
    eventId: "event-18",
    shipmentId: shipment.id,
    version: 18,
    type: "SHIPMENT_UPDATED",
    timestamp: "2026-07-24T11:00:00.000Z",
    payload: { priority: "CRITICAL" },
    ...overrides,
  };
}

describe("reconcileShipmentEvent", () => {
  let queryClient: QueryClient;
  let registry: ReconciliationRegistry;

  beforeEach(() => {
    queryClient = new QueryClient();
    registry = new ReconciliationRegistry();
    queryClient.setQueryData<ShipmentListResponse>(
      operationsKeys.list(listParams),
      {
        items: [shipment, untouched],
        page: 1,
        pageSize: 50,
        total: 2,
        summary: {
          totalExceptions: 2,
          criticalExceptions: 0,
          unassignedShipments: 2,
          acknowledgedExceptions: 0,
        },
      },
    );
  });

  it("rejects duplicate event IDs without touching the cache", () => {
    expect(
      reconcileShipmentEvent(event(), queryClient, registry).accepted,
    ).toBe(true);
    const cached = queryClient.getQueryData(operationsKeys.list(listParams));

    expect(
      reconcileShipmentEvent(event({ version: 19 }), queryClient, registry),
    ).toEqual({ accepted: false, reason: "duplicate" });
    expect(queryClient.getQueryData(operationsKeys.list(listParams))).toBe(
      cached,
    );
  });

  it("rejects stale and out-of-order versions", () => {
    const cached = queryClient.getQueryData(operationsKeys.list(listParams));
    expect(
      reconcileShipmentEvent(
        event({ eventId: "event-17", version: 17 }),
        queryClient,
        registry,
      ),
    ).toEqual({ accepted: false, reason: "stale" });
    expect(queryClient.getQueryData(operationsKeys.list(listParams))).toBe(
      cached,
    );
  });

  it("applies a newer event and preserves unrelated row references", () => {
    const result = reconcileShipmentEvent(event(), queryClient, registry);
    const data = queryClient.getQueryData<ShipmentListResponse>(
      operationsKeys.list(listParams),
    )!;

    expect(result).toMatchObject({ accepted: true, visible: true });
    expect(data.items[0]).toMatchObject({
      priority: "CRITICAL",
      version: 18,
      updatedAt: "2026-07-24T11:00:00.000Z",
    });
    expect(data.items[1]).toBe(untouched);
  });

  it("records non-visible versions without creating cache entries", () => {
    const result = reconcileShipmentEvent(
      event({ eventId: "hidden-4", shipmentId: "hidden", version: 4 }),
      queryClient,
      registry,
    );

    expect(result).toMatchObject({ accepted: true, visible: false });
    expect(queryClient.getQueryData(operationsKeys.detail("hidden"))).toBe(
      undefined,
    );
    expect(registry.getConfirmedVersion("hidden")).toBe(4);
  });
});
