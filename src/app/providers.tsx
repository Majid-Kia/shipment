import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createAppQueryClient } from "@/app/query-client";
import { RoleProvider } from "@/auth/role-provider";
import type { UserRole } from "@/auth/role";
import { Toaster } from "@/components/ui/sonner";

const appQueryClient = createAppQueryClient();

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRole?: UserRole;
}

export function AppProviders({
  children,
  queryClient = appQueryClient,
  initialRole,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider initialRole={initialRole}>
        {children}
        <Toaster />
      </RoleProvider>
    </QueryClientProvider>
  );
}
