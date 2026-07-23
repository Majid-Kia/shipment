export const USER_ROLES = ["VIEWER", "OPERATOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];
