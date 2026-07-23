import type { Operator } from "@/domain/operator";
import type {
  ExceptionType,
  Shipment,
  ShipmentDetails,
  ShipmentPriority,
  ShipmentStatus,
} from "@/domain/shipment";

export interface ShipmentListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: ShipmentStatus;
  priority?: ShipmentPriority;
  exceptionType?: ExceptionType;
  originPort?: string;
  assigned?: boolean;
}

export interface ShipmentSummary {
  totalExceptions: number;
  criticalExceptions: number;
  unassignedShipments: number;
  acknowledgedExceptions: number;
}

export interface ShipmentListResponse {
  items: Shipment[];
  page: number;
  pageSize: number;
  total: number;
  summary: ShipmentSummary;
}

export interface OperatorsResponse {
  items: Operator[];
}

export interface AcknowledgeShipmentRequest {
  expectedVersion: number;
}

export interface AssignShipmentRequest {
  operatorId: string;
  expectedVersion: number;
}

export interface ShipmentMutationResponse {
  shipment: ShipmentDetails;
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "VERSION_CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN";

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
    details?: Record<string, string>;
  };
}
