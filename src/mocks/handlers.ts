import { HttpResponse, delay, http } from "msw";
import { z } from "zod";

import type { ApiErrorBody, ErrorCode } from "@/api/shipment-contracts";
import {
  acknowledgeShipmentRequestSchema,
  assignShipmentRequestSchema,
} from "@/api/shipment-contracts";
import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  SHIPMENT_STATUSES,
  type ShipmentDetails,
} from "@/domain/shipment";
import { RepositoryError, shipmentRepository } from "@/mocks/database";
import {
  getMutationDelay,
  notifyMutationPreflight,
  shouldFailMutation,
} from "@/mocks/scenarios";

let requestCounter = 0;

const listParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().min(1).optional(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
  priority: z.enum(SHIPMENT_PRIORITIES).optional(),
  exceptionType: z.enum(EXCEPTION_TYPES).optional(),
  originPort: z.string().trim().min(1).optional(),
  assigned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  retryable = false,
) {
  requestCounter += 1;
  return HttpResponse.json<ApiErrorBody>(
    {
      error: {
        code,
        message,
        requestId: `req-${requestCounter}`,
        retryable,
      },
    },
    { status },
  );
}

function repositoryErrorResponse(error: RepositoryError) {
  const status =
    error.code === "NOT_FOUND" ? 404 : error.code === "BAD_REQUEST" ? 400 : 409;
  return errorResponse(status, error.code, error.message);
}

function isOperator(request: Request) {
  return (request.headers.get("x-mock-role") ?? "OPERATOR") === "OPERATOR";
}

async function executeMockShipmentMutation(
  validate: () => void,
  commit: () => ShipmentDetails,
) {
  try {
    validate();
    notifyMutationPreflight();
    await delay(getMutationDelay());
    if (shouldFailMutation()) {
      return errorResponse(
        503,
        "SERVICE_UNAVAILABLE",
        "The mutation failed. Please try again.",
        true,
      );
    }
    return HttpResponse.json({ shipment: commit() });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return repositoryErrorResponse(error);
    }
    throw error;
  }
}

export const handlers = [
  http.get("/api/shipments", ({ request }) => {
    const url = new URL(request.url);
    const parsed = listParamsSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      return errorResponse(
        400,
        "BAD_REQUEST",
        "Shipment list parameters are invalid.",
      );
    }
    return HttpResponse.json(shipmentRepository.list(parsed.data));
  }),

  http.get("/api/shipments/:id", ({ params }) => {
    const shipment = shipmentRepository.get(String(params.id));
    return shipment
      ? HttpResponse.json(shipment)
      : errorResponse(404, "NOT_FOUND", "Shipment was not found.");
  }),

  http.get("/api/operators", () =>
    HttpResponse.json({ items: shipmentRepository.listOperators() }),
  ),

  http.post("/api/shipments/:id/acknowledge", async ({ params, request }) => {
    if (!isOperator(request)) {
      return errorResponse(403, "FORBIDDEN", "Operator role is required.");
    }
    const parsed = acknowledgeShipmentRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return errorResponse(400, "BAD_REQUEST", "Request body is invalid.");
    }

    return executeMockShipmentMutation(
      () =>
        shipmentRepository.validateAcknowledge(
          String(params.id),
          parsed.data.expectedVersion,
        ),
      () =>
        shipmentRepository.acknowledge(
          String(params.id),
          parsed.data.expectedVersion,
        ),
    );
  }),

  http.post("/api/shipments/:id/assign", async ({ params, request }) => {
    if (!isOperator(request)) {
      return errorResponse(403, "FORBIDDEN", "Operator role is required.");
    }
    const parsed = assignShipmentRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return errorResponse(400, "BAD_REQUEST", "Request body is invalid.");
    }

    return executeMockShipmentMutation(
      () =>
        shipmentRepository.validateAssign(
          String(params.id),
          parsed.data.operatorId,
          parsed.data.expectedVersion,
        ),
      () =>
        shipmentRepository.assign(
          String(params.id),
          parsed.data.operatorId,
          parsed.data.expectedVersion,
        ),
    );
  }),
];

export function resetRequestCounter() {
  requestCounter = 0;
}
