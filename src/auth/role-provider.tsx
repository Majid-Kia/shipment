import { useMemo, useState, type ReactNode } from "react";

import { RoleContext } from "@/auth/role-context";
import type { UserRole } from "@/auth/role";

export function RoleProvider({
  children,
  initialRole = "OPERATOR",
}: {
  children: ReactNode;
  initialRole?: UserRole;
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const value = useMemo(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
