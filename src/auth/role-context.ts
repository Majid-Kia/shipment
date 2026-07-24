import { createContext, useContext } from "react";

import type { UserRole } from "@/auth/role";

export interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider.");
  }
  return context;
}
