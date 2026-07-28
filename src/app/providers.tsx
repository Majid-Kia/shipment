import {
  QueryClientProvider,
  type QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";

import { createAppQueryClient } from "@/app/query-client";
import type { UserRole } from "@/auth/permissions";
import { RoleProvider } from "@/auth/role-context";
import { createOperationsRealtimeCache } from "@/features/operations/model/operations-realtime-cache";
import type { ShipmentEventSource } from "@/realtime/contracts";
import { RealtimeProvider } from "@/realtime/realtime-provider";

const appQueryClient = createAppQueryClient();

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRole?: UserRole;
  realtimeSource: ShipmentEventSource;
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
        <OperationsRealtimeProvider source={realtimeSource}>
          {children}
        </OperationsRealtimeProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}

function OperationsRealtimeProvider({
  children,
  source,
}: {
  children: ReactNode;
  source: ShipmentEventSource;
}) {
  const queryClient = useQueryClient();
  const cache = useMemo(
    () => createOperationsRealtimeCache(queryClient),
    [queryClient],
  );

  return (
    <RealtimeProvider cache={cache} source={source}>
      {children}
    </RealtimeProvider>
  );
}
