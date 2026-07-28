import { describe, expect, it } from "vitest";

import { getShipment } from "@/entities/shipment/api/shipments-api";
import { getShipments } from "@/features/operations/api/operations-api";
import { shipmentRepository } from "@/mocks/database";

describe("operations API", () => {
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
});
