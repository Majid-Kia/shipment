import { describe, expect, it } from "vitest";

import { getOperators } from "@/entities/operator/api/operators-api";

describe("operator API", () => {
  it("returns the deterministic operator directory", async () => {
    const response = await getOperators();

    expect(response.items).toHaveLength(20);
    expect(response.items[0]).toEqual({
      id: "OP-01",
      name: "Operator 01",
    });
  });
});
