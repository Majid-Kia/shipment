import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 2,
      staleTime: 15 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
};

export function createAppQueryClient(config?: QueryClientConfig) {
  return new QueryClient(config ?? queryClientConfig);
}
