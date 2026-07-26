import type { ReactNode } from "react";

import { can, type Permission } from "@/auth/permissions";
import { useRole } from "@/auth/role-context";

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role } = useRole();
  return can(role, permission) ? children : fallback;
}
