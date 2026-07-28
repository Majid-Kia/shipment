import { z } from "zod";

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "FORBIDDEN",
  "INVALID_STATE",
  "VERSION_CONFLICT",
  "SERVICE_UNAVAILABLE",
  "UNKNOWN",
]);

export const apiErrorBodySchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.string()).optional(),
  }),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

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
