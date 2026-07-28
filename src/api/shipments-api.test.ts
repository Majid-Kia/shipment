import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import {
  acknowledgeShipment,
  assignShipment,
  getOperators,
  getShipment,
  getShipments,
} from "@/api/shipments-api";
import { shipmentRepository } from "@/mocks/database";
import { server } from "@/mocks/server";
import {
  forceNextMutationResult,
  setMutationFailureRate,
} from "@/mocks/scenarios";

describe("shipment API", () => {
  it("serves 5,000 deterministic records and defaults to active exceptions", async () => {
    expect(shipmentRepository.count()).toBe(5_000);

    const response = await getShipments({ page: 1, pageSize: 50 });

    expect(response.items).toHaveLength(50);
    expect(response.total).toBe(4_000);
    expect(response.summary.totalExceptions).toBe(response.total);
    expect(response.items.every(({ status }) => status !== "RESOLVED")).toBe(
      true,
    );
    expect(response.items[0]?.id).toBe("SHP-100000");
  });

  it("makes resolved shipments available through an explicit filter", async () => {
    const response = await getShipments({
      page: 1,
      pageSize: 50,
      status: "RESOLVED",
    });

    expect(response.total).toBe(1_000);
    expect(response.summary.totalExceptions).toBe(1_000);
    expect(response.items.every(({ status }) => status === "RESOLVED")).toBe(
      true,
    );
  });

  it("applies search and conjunctive server-style filters before pagination", async () => {
    const target = await getShipment("SHP-100000");
    const response = await getShipments({
      page: 1,
      pageSize: 50,
      search: "100000",
      priority: target.priority,
      exceptionType: target.exceptionType,
      originPort: target.originPort,
      assigned: false,
    });

    expect(response.total).toBe(1);
    expect(response.items[0]?.id).toBe(target.id);
    expect(response.summary.unassignedShipments).toBe(1);
    expect(response.summary.criticalExceptions).toBe(
      target.priority === "CRITICAL" ? 1 : 0,
    );
  });

  it("returns stable, non-overlapping pages of the requested size", async () => {
    const first = await getShipments({ page: 1, pageSize: 25 });
    const second = await getShipments({ page: 2, pageSize: 25 });

    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(25);
    expect(first.total).toBe(second.total);
    expect(
      first.items.some(({ id }) =>
        second.items.some((shipment) => shipment.id === id),
      ),
    ).toBe(false);
    expect(
      first.items.every(
        (shipment, index) =>
          index === 0 ||
          first.items[index - 1]!.updatedAt >= shipment.updatedAt,
      ),
    ).toBe(true);
  });

  it("returns shipment details with history and five recent events", async () => {
    const detail = await getShipment("SHP-100008");

    expect(detail.statusHistory.length).toBeGreaterThanOrEqual(2);
    expect(detail.recentEvents).toHaveLength(5);
    expect(detail.exception.description).not.toBe("");
  });

  it("returns the deterministic operator directory", async () => {
    const response = await getOperators();

    expect(response.items).toHaveLength(20);
    expect(response.items[0]).toEqual({
      id: "OP-01",
      name: "Operator 01",
    });
  });

  it("rejects viewer mutations without changing server state", async () => {
    const before = await getShipment("SHP-100000");

    await expect(
      acknowledgeShipment(
        before.id,
        { expectedVersion: before.version },
        "VIEWER",
      ),
    ).rejects.toMatchObject({
      appError: { code: "FORBIDDEN", status: 403 },
    });
    expect(await getShipment(before.id)).toEqual(before);
  });

  it("supports deterministic mutation failure without changing server state", async () => {
    const before = await getShipment("SHP-100000");
    forceNextMutationResult("failure");

    await expect(
      acknowledgeShipment(before.id, { expectedVersion: before.version }),
    ).rejects.toMatchObject({
      appError: {
        kind: "http",
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        retryable: true,
      },
    });

    expect(await getShipment(before.id)).toEqual(before);
  });

  it("acknowledges and assigns with authoritative version increments", async () => {
    setMutationFailureRate(0);
    const before = await getShipment("SHP-100000");
    const assigned = await assignShipment(before.id, {
      operatorId: "OP-03",
      expectedVersion: before.version,
    });

    expect(assigned.shipment.assignedTo?.id).toBe("OP-03");
    expect(assigned.shipment.version).toBe(before.version + 1);
    expect(assigned.shipment.recentEvents[0]?.type).toBe("SHIPMENT_ASSIGNED");

    const acknowledged = await acknowledgeShipment(before.id, {
      expectedVersion: assigned.shipment.version,
    });
    expect(acknowledged.shipment.status).toBe("ACKNOWLEDGED");
    expect(acknowledged.shipment.version).toBe(before.version + 2);
    expect(acknowledged.shipment.statusHistory.at(-1)?.to).toBe("ACKNOWLEDGED");
  });

  it("rejects stale versions and invalid resolved-shipment actions", async () => {
    setMutationFailureRate(0);
    const open = await getShipment("SHP-100000");
    await assignShipment(open.id, {
      operatorId: "OP-01",
      expectedVersion: open.version,
    });

    await expect(
      acknowledgeShipment(open.id, { expectedVersion: open.version }),
    ).rejects.toMatchObject({
      appError: { code: "VERSION_CONFLICT", status: 409 },
    });

    const resolved = await getShipment("SHP-100008");
    await expect(
      assignShipment(resolved.id, {
        operatorId: "OP-01",
        expectedVersion: resolved.version,
      }),
    ).rejects.toMatchObject({
      appError: { code: "INVALID_STATE", status: 409 },
    });
  });

  it("maps malformed successful responses to a validation error", async () => {
    server.use(
      http.get("/api/shipments/:id", () =>
        HttpResponse.json({ id: "incomplete" }),
      ),
    );

    await expect(getShipment("SHP-100000")).rejects.toMatchObject({
      name: "ApiClientError",
      appError: {
        kind: "validation",
        retryable: false,
      },
    });
  });
});
