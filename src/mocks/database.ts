import type {
  ShipmentListParams,
  ShipmentListResponse,
} from "@/features/operations/api/operations-contracts";
import {
  EXCEPTION_TYPES,
  SHIPMENT_PRIORITIES,
  toShipment,
  type ShipmentDetails,
  type ShipmentStatus,
} from "@/entities/shipment/model/shipment";
import type { Operator } from "@/entities/operator/model/operator";
import { createOperators, createShipments } from "@/mocks/factories";
import type { ShipmentRealtimeEvent } from "@/realtime/contracts";

export class RepositoryError extends Error {
  readonly code:
    "NOT_FOUND" | "INVALID_STATE" | "VERSION_CONFLICT" | "BAD_REQUEST";

  constructor(
    code: "NOT_FOUND" | "INVALID_STATE" | "VERSION_CONFLICT" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
  }
}

function copyDetails(shipment: ShipmentDetails) {
  return structuredClone(shipment);
}

class ShipmentRepository {
  private shipments = new Map<string, ShipmentDetails>();
  private operators: Operator[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.operators = createOperators();
    this.shipments = new Map(
      createShipments().map((shipment) => [shipment.id, shipment]),
    );
  }

  count() {
    return this.shipments.size;
  }

  listOperators() {
    return structuredClone(this.operators);
  }

  get(id: string) {
    const shipment = this.shipments.get(id);
    return shipment ? copyDetails(shipment) : null;
  }

  applyRandomRealtimeUpdate(random = Math.random): ShipmentRealtimeEvent {
    const shipments = [...this.shipments.values()];
    const shipment = shipments[Math.floor(random() * shipments.length)]!;
    const timestamp = this.nextTimestamp(shipment);
    const choice = Math.floor(random() * 3);
    const payload: ShipmentRealtimeEvent["payload"] =
      choice === 0
        ? {
            priority:
              SHIPMENT_PRIORITIES[
                Math.floor(random() * SHIPMENT_PRIORITIES.length)
              ]!,
          }
        : choice === 1
          ? {
              exceptionType:
                EXCEPTION_TYPES[Math.floor(random() * EXCEPTION_TYPES.length)]!,
            }
          : {
              eta: new Date(
                new Date(shipment.eta).getTime() +
                  (1 + Math.floor(random() * 12)) * 60 * 60 * 1000,
              ).toISOString(),
            };

    shipment.version += 1;
    shipment.updatedAt = timestamp;
    Object.assign(shipment, payload);
    this.addEvent(
      shipment,
      "SHIPMENT_UPDATED",
      "Shipment updated in realtime.",
    );

    return {
      eventId: `${shipment.id}-realtime-v${shipment.version}`,
      shipmentId: shipment.id,
      version: shipment.version,
      type: "SHIPMENT_UPDATED",
      timestamp,
      payload: { ...payload, updatedAt: timestamp },
    };
  }

  list(params: ShipmentListParams): ShipmentListResponse {
    const normalizedSearch = params.search?.trim().toLowerCase();
    const activeStatuses: ShipmentStatus[] = ["OPEN", "ACKNOWLEDGED"];

    const filtered = [...this.shipments.values()]
      .filter((shipment) =>
        params.status
          ? shipment.status === params.status
          : activeStatuses.includes(shipment.status),
      )
      .filter(
        (shipment) =>
          !normalizedSearch ||
          shipment.shipmentNumber.toLowerCase().includes(normalizedSearch) ||
          shipment.originPort.toLowerCase().includes(normalizedSearch) ||
          shipment.destinationPort.toLowerCase().includes(normalizedSearch),
      )
      .filter(
        (shipment) => !params.priority || shipment.priority === params.priority,
      )
      .filter(
        (shipment) =>
          !params.exceptionType ||
          shipment.exceptionType === params.exceptionType,
      )
      .filter(
        (shipment) =>
          !params.originPort || shipment.originPort === params.originPort,
      )
      .filter(
        (shipment) =>
          params.assigned === undefined ||
          (params.assigned
            ? shipment.assignedTo !== null
            : shipment.assignedTo === null),
      )
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.id.localeCompare(right.id),
      );

    const summary = {
      totalExceptions: filtered.length,
      criticalExceptions: filtered.filter(
        ({ priority }) => priority === "CRITICAL",
      ).length,
      unassignedShipments: filtered.filter(
        ({ assignedTo }) => assignedTo === null,
      ).length,
      acknowledgedExceptions: filtered.filter(
        ({ status }) => status === "ACKNOWLEDGED",
      ).length,
    };
    const start = (params.page - 1) * params.pageSize;

    return {
      items: filtered
        .slice(start, start + params.pageSize)
        .map((shipment) => structuredClone(toShipment(shipment))),
      page: params.page,
      pageSize: params.pageSize,
      total: filtered.length,
      summary,
    };
  }

  acknowledge(id: string, expectedVersion: number) {
    const shipment = this.validateAcknowledge(id, expectedVersion);

    const now = this.nextTimestamp(shipment);
    shipment.status = "ACKNOWLEDGED";
    shipment.version += 1;
    shipment.updatedAt = now;
    shipment.statusHistory.push({
      id: `${id}-history-${shipment.statusHistory.length + 1}`,
      from: "OPEN",
      to: "ACKNOWLEDGED",
      at: now,
      actor: "Mock operator",
    });
    this.addEvent(shipment, "SHIPMENT_ACKNOWLEDGED", "Exception acknowledged.");
    return copyDetails(shipment);
  }

  assign(id: string, operatorId: string, expectedVersion: number) {
    const { operator, shipment } = this.validateAssign(
      id,
      operatorId,
      expectedVersion,
    );

    shipment.assignedTo = structuredClone(operator);
    shipment.version += 1;
    shipment.updatedAt = this.nextTimestamp(shipment);
    this.addEvent(
      shipment,
      "SHIPMENT_ASSIGNED",
      `Assigned to ${operator.name}.`,
    );
    return copyDetails(shipment);
  }

  validateAcknowledge(id: string, expectedVersion: number) {
    const shipment = this.requireShipment(id);
    this.requireVersion(shipment, expectedVersion);
    if (shipment.status !== "OPEN") {
      throw new RepositoryError(
        "INVALID_STATE",
        "Only open shipments can be acknowledged.",
      );
    }
    return shipment;
  }

  validateAssign(id: string, operatorId: string, expectedVersion: number) {
    const shipment = this.requireShipment(id);
    this.requireVersion(shipment, expectedVersion);
    if (shipment.status === "RESOLVED") {
      throw new RepositoryError(
        "INVALID_STATE",
        "Resolved shipments cannot be assigned.",
      );
    }
    const operator = this.operators.find(
      ({ id: value }) => value === operatorId,
    );
    if (!operator) {
      throw new RepositoryError("BAD_REQUEST", "Operator does not exist.");
    }
    return { operator, shipment };
  }

  private requireShipment(id: string) {
    const shipment = this.shipments.get(id);
    if (!shipment) {
      throw new RepositoryError("NOT_FOUND", "Shipment was not found.");
    }
    return shipment;
  }

  private requireVersion(shipment: ShipmentDetails, expectedVersion: number) {
    if (shipment.version !== expectedVersion) {
      throw new RepositoryError(
        "VERSION_CONFLICT",
        `Expected version ${expectedVersion}, current version is ${shipment.version}.`,
      );
    }
  }

  private nextTimestamp(shipment: ShipmentDetails) {
    return new Date(Date.parse(shipment.updatedAt) + 1_000).toISOString();
  }

  private addEvent(
    shipment: ShipmentDetails,
    type: "SHIPMENT_UPDATED" | "SHIPMENT_ACKNOWLEDGED" | "SHIPMENT_ASSIGNED",
    summary: string,
  ) {
    shipment.recentEvents = [
      {
        eventId: `${shipment.id}-evt-v${shipment.version}`,
        type,
        timestamp: shipment.updatedAt,
        summary,
        version: shipment.version,
      },
      ...shipment.recentEvents,
    ].slice(0, 5);
  }
}

export const shipmentRepository = new ShipmentRepository();
