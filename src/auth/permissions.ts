export const USER_ROLES = ["VIEWER", "OPERATOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type Permission =
  "shipment:view" | "shipment:acknowledge" | "shipment:assign";

const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  VIEWER: new Set(["shipment:view"]),

  OPERATOR: new Set([
    "shipment:view",
    "shipment:acknowledge",
    "shipment:assign",
  ]),
};

export function can(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].has(permission);
}
