import { operatorsResponseSchema } from "@/entities/operator/api/operator-contracts";
import { request } from "@/shared/api/http-client";

export function getOperators(signal?: AbortSignal) {
  return request("/api/operators", operatorsResponseSchema, { signal });
}
