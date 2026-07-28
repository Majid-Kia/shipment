import { Outlet } from "react-router";

import { USER_ROLES } from "@/auth/permissions";
import { useRole } from "@/auth/role-context";

export function AppShell() {
  const { role, setRole } = useRole();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-4">
          <span className="text-sm font-semibold">Shipment Operations</span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Mock role
            <select
              aria-label="Mock role"
              className="h-8 rounded-md border bg-background px-2 text-foreground"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              {USER_ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
