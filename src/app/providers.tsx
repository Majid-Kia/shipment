import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createAppQueryClient } from "@/app/query-client";
import { RoleProvider } from "@/auth/role-provider";
import type { UserRole } from "@/auth/role";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeProvider } from "@/realtime/realtime-provider";
import type { ShipmentEventSource } from "@/realtime/shipment-event-source";

const appQueryClient = createAppQueryClient();

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRole?: UserRole;
  realtimeSource?: ShipmentEventSource;
}

export function AppProviders({
  children,
  queryClient = appQueryClient,
  initialRole,
  realtimeSource,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider initialRole={initialRole}>
        <RealtimeProvider source={realtimeSource}>{children}</RealtimeProvider>
        <Toaster />
      </RoleProvider>
    </QueryClientProvider>
  );
}
