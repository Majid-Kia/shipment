import { describe, expect, it } from "vitest";

import { createAppQueryClient } from "@/app/query-client";
import { ApiClientError } from "@/domain/errors";

describe("query client resilience policy", () => {
  it("retries bounded retryable reads but not 4xx or validation errors", () => {
    const client = createAppQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe("function");
    if (typeof retry !== "function") return;

    const network = new ApiClientError({
      kind: "network",
      message: "offline",
      retryable: true,
    });
    const badRequest = new ApiClientError({
      kind: "http",
      status: 400,
      code: "BAD_REQUEST",
      message: "bad request",
      retryable: false,
    });

    expect(retry(0, network)).toBe(true);
    expect(retry(1, network)).toBe(true);
    expect(retry(2, network)).toBe(false);
    expect(retry(0, badRequest)).toBe(false);
  });

  it("never automatically retries mutations", () => {
    expect(createAppQueryClient().getDefaultOptions().mutations?.retry).toBe(
      false,
    );
  });
});
