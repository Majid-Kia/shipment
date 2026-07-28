import type { ErrorCode } from "@/api/shipment-contracts";

export type AppError =
  | {
      kind: "http";
      status: number;
      code: ErrorCode;
      message: string;
      retryable: boolean;
    }
  | { kind: "network"; message: string; retryable: true }
  | { kind: "validation"; message: string; retryable: false }
  | { kind: "unknown"; message: string; retryable: false };

export class ApiClientError extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = "ApiClientError";
    this.appError = appError;
  }
}
