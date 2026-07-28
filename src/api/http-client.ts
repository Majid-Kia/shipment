import { ZodError, type ZodType } from "zod";

import { ApiClientError } from "@/api/errors";
import { apiErrorBodySchema } from "@/api/shipment-contracts";

interface RequestOptions {
  body?: unknown;
  method?: "GET" | "POST";
  role?: "VIEWER" | "OPERATOR";
  signal?: AbortSignal;
}

export async function request<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
) {
  const url = new URL(path, window.location.origin);

  try {
    const response = await fetch(url, {
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        "x-mock-role": options.role ?? "OPERATOR",
      },
      method: options.method ?? "GET",
      signal: options.signal,
    });
    const json: unknown = await response.json();

    if (!response.ok) {
      const parsedError = apiErrorBodySchema.safeParse(json);
      throw new ApiClientError(
        parsedError.success
          ? {
              kind: "http",
              status: response.status,
              code: parsedError.data.error.code,
              message: parsedError.data.error.message,
              retryable: parsedError.data.error.retryable,
            }
          : {
              kind: "unknown",
              message: `Request failed with status ${response.status}.`,
              retryable: false,
            },
      );
    }

    return schema.parse(json);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof ZodError) {
      throw new ApiClientError({
        kind: "validation",
        message: "The server response did not match the expected contract.",
        retryable: false,
      });
    }
    if (error instanceof TypeError) {
      throw new ApiClientError({
        kind: "network",
        message: "The server could not be reached.",
        retryable: true,
      });
    }
    throw new ApiClientError({
      kind: "unknown",
      message:
        error instanceof Error ? error.message : "Unknown request error.",
      retryable: false,
    });
  }
}
