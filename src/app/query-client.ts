import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

import { ApiClientError } from "@/shared/api/errors";

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        error instanceof ApiClientError &&
        error.appError.retryable,
      retryDelay: (attempt) => Math.min(2_000, 250 * 2 ** attempt),
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
