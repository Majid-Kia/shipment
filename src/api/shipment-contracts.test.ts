import { describe, expect, it } from "vitest";

import { assignShipmentRequestSchema } from "@/api/shipment-contracts";

describe("shipment API contracts", () => {
  it("rejects malformed mutation request bodies", () => {
    expect(
      assignShipmentRequestSchema.safeParse({
        operatorId: "",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
  });
});
