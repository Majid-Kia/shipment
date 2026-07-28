import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  RouterProvider,
  createMemoryRouter,
  type InitialEntry,
} from "react-router";

import { AppProviders } from "@/app/providers";
import { createAppQueryClient } from "@/app/query-client";
import { appRoutes } from "@/app/router";
import type { UserRole } from "@/auth/permissions";
import { MockShipmentEventSource } from "@/mocks/realtime-source";
import type { ShipmentEventSource } from "@/realtime/contracts";

interface RenderAppOptions {
  initialEntries?: InitialEntry[];
  queryClient?: QueryClient;
  initialRole?: UserRole;
  realtimeSource?: ShipmentEventSource;
}

export function renderApp({
  initialEntries = ["/operations"],
  queryClient = createAppQueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: 0, retry: false },
    },
  }),
  initialRole,
  realtimeSource = new MockShipmentEventSource(),
}: RenderAppOptions = {}) {
  const router = createMemoryRouter(appRoutes, { initialEntries });

  return {
    queryClient,
    router,
    ...render(
      <AppProviders
        queryClient={queryClient}
        initialRole={initialRole}
        realtimeSource={realtimeSource}
      >
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

export function renderWithProviders(
  ui: ReactElement,
  queryClient = createAppQueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: 0, retry: false },
    },
  }),
) {
  const realtimeSource = new MockShipmentEventSource();

  return {
    queryClient,
    ...render(
      <AppProviders queryClient={queryClient} realtimeSource={realtimeSource}>
        {ui}
      </AppProviders>,
    ),
  };
}
