import { Outlet } from "react-router";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-screen-2xl items-center px-6 py-4">
          <span className="text-sm font-semibold">Shipment Operations</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
