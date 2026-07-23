import { describe, expect, it } from "vitest";

import {
  assignShipmentRequestSchema,
  shipmentDetailsSchema,
} from "@/domain/schemas";
import { shipmentRepository } from "@/mocks/database";

describe("runtime schemas", () => {
  it("accepts a complete generated shipment detail", () => {
    expect(
      shipmentDetailsSchema.safeParse(shipmentRepository.get("SHP-100000"))
        .success,
    ).toBe(true);
  });

  it("rejects unknown enum values, invalid timestamps, and extra fields", () => {
    const shipment = shipmentRepository.get("SHP-100000")!;

    expect(
      shipmentDetailsSchema.safeParse({
        ...shipment,
        status: "CANCELLED",
        eta: "tomorrow",
        unexpected: true,
      }).success,
    ).toBe(false);
  });

  it("rejects malformed mutation contracts", () => {
    expect(
      assignShipmentRequestSchema.safeParse({
        operatorId: "",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
});
