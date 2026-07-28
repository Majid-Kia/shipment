import { describe, expect, it } from "vitest";

import { operationsKeys } from "@/features/operations/model/operations-query-keys";

describe("operations query keys", () => {
  it("normalizes equivalent list parameters", () => {
    expect(
      operationsKeys.list({
        page: 1,
        pageSize: 50,
        search: "  SHP-100  ",
      }),
    ).toEqual(
      operationsKeys.list({
        page: 1,
        pageSize: 50,
        search: "SHP-100",
      }),
    );
  });

  it("keeps list and detail namespaces distinct", () => {
    expect(operationsKeys.list({ page: 1, pageSize: 50 })).not.toEqual(
      operationsKeys.detail("SHP-100000"),
    );
  });
});
