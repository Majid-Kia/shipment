import type { Operator } from "@/domain/operator";
import type {
  ExceptionType,
  ShipmentDetails,
  ShipmentPriority,
  ShipmentStatus,
} from "@/domain/shipment";
import { EXCEPTION_TYPES, SHIPMENT_PRIORITIES } from "@/domain/shipment";
import { PORT_CODES } from "@/domain/port";

const BASE_TIME = Date.parse("2026-07-21T12:00:00.000Z");

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

export function createOperators(count = 20): Operator[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `OP-${String(index + 1).padStart(2, "0")}`,
    name: `Operator ${String(index + 1).padStart(2, "0")}`,
  }));
}

function statusFor(index: number): ShipmentStatus {
  if (index % 10 < 5) return "OPEN";
  if (index % 10 < 8) return "ACKNOWLEDGED";
  return "RESOLVED";
}

export function createShipments(
  count = 5_000,
  seed = 20_260_721,
): ShipmentDetails[] {
  const random = createRandom(seed);
  const operators = createOperators();

  return Array.from({ length: count }, (_, index) => {
    const idNumber = 100_000 + index;
    const id = `SHP-${idNumber}`;
    const status = statusFor(index);
    const priority = SHIPMENT_PRIORITIES[
      Math.floor(random() * SHIPMENT_PRIORITIES.length)
    ] as ShipmentPriority;
    const exceptionType = EXCEPTION_TYPES[
      Math.floor(random() * EXCEPTION_TYPES.length)
    ] as ExceptionType;
    const originPort = PORT_CODES[index % PORT_CODES.length];
    const destinationPort = PORT_CODES[(index * 3 + 1) % PORT_CODES.length];
    const assignedTo =
      index % 3 === 0 ? null : operators[index % operators.length];
    const updatedAt = new Date(BASE_TIME - index * 60_000).toISOString();
    const detectedAt = new Date(
      BASE_TIME - (index + 120) * 60_000,
    ).toISOString();
    const version = 1 + (index % 20);
    const initialStatus: ShipmentStatus =
      status === "OPEN" ? "OPEN" : "ACKNOWLEDGED";

    return {
      id,
      shipmentNumber: id,
      originPort,
      destinationPort,
      eta: new Date(BASE_TIME + (24 + (index % 240)) * 3_600_000).toISOString(),
      exceptionType,
      priority,
      status,
      assignedTo,
      version,
      updatedAt,
      exception: {
        description: `${exceptionType.replaceAll("_", " ")} requires operational review.`,
        detectedAt,
      },
      statusHistory: [
        {
          id: `${id}-history-1`,
          from: null,
          to: "OPEN",
          at: detectedAt,
          actor: "Exception monitor",
        },
        ...(status === "OPEN"
          ? []
          : [
              {
                id: `${id}-history-2`,
                from: "OPEN" as const,
                to: initialStatus,
                at: updatedAt,
                actor: "Operator 01",
              },
            ]),
        ...(status === "RESOLVED"
          ? [
              {
                id: `${id}-history-3`,
                from: "ACKNOWLEDGED" as const,
                to: "RESOLVED" as const,
                at: updatedAt,
                actor: "Operator 02",
              },
            ]
          : []),
      ],
      recentEvents: Array.from({ length: 5 }, (_, eventIndex) => ({
        eventId: `${id}-evt-${eventIndex + 1}`,
        type: "SHIPMENT_UPDATED" as const,
        timestamp: new Date(
          Date.parse(updatedAt) - eventIndex * 60_000,
        ).toISOString(),
        summary:
          eventIndex === 0
            ? `Shipment is ${status.toLowerCase()}.`
            : "Shipment telemetry updated.",
        version: Math.max(1, version - eventIndex),
      })),
    };
  });
}
