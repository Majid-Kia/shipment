import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createAppQueryClient } from "@/app/query-client";
import type { UserRole } from "@/auth/permissions";
import { RoleProvider } from "@/auth/role-context";
import { MockShipmentEventSource } from "@/mocks/realtime-source";
import type { ShipmentEventSource } from "@/realtime/contracts";
import { RealtimeProvider } from "@/realtime/realtime-provider";

const appQueryClient = createAppQueryClient();
const appRealtimeSource = new MockShipmentEventSource();

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
        <RealtimeProvider source={realtimeSource ?? appRealtimeSource}>
          {children}
        </RealtimeProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}
