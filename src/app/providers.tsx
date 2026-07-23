import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { createAppQueryClient } from "@/app/query-client";
import { Toaster } from "@/components/ui/sonner";

const appQueryClient = createAppQueryClient();

interface AppProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AppProviders({
  children,
  queryClient = appQueryClient,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
