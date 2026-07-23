import { request } from "@/api/http-client";
import { operatorsResponseSchema } from "@/domain/schemas";

export function getOperators(signal?: AbortSignal) {
  return request("/api/operators", operatorsResponseSchema, { signal });
}
