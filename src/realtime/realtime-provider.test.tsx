import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  RealtimeConnectionState,
  ShipmentEventSource,
} from "@/realtime/contracts";
import {
  RealtimeProvider,
  useRealtimeConnectionState,
} from "@/realtime/realtime-provider";
import type { ShipmentRealtimeCache } from "@/realtime/shipment-cache";

class ManualShipmentEventSource implements ShipmentEventSource {
  private eventListeners = new Set<(event: unknown) => void>();
  private connectionListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private state: RealtimeConnectionState = "disconnected";

  connect() {
    this.setConnectionState("connecting");
    this.setConnectionState("connected");
  }

  disconnect() {
    this.setConnectionState("disconnected");
  }

  subscribe(listener: (event: unknown) => void) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  subscribeToConnection(listener: (state: RealtimeConnectionState) => void) {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  getConnectionState() {
    return this.state;
  }

  emit(event: unknown) {
    for (const listener of this.eventListeners) listener(event);
  }

  setConnectionState(state: RealtimeConnectionState) {
    this.state = state;
    for (const listener of this.connectionListeners) listener(state);
  }
}

function StateProbe() {
  return <span>{useRealtimeConnectionState()}</span>;
}

describe("RealtimeProvider", () => {
  it("refreshes cached data after the full reconnect lifecycle", () => {
    const queryClient = new QueryClient();

    const cache: ShipmentRealtimeCache = {
      applyEvent: vi.fn(),
      findHighestVersion: vi.fn(),
      invalidateLists: vi.fn(),
      invalidateObservedDetails: vi.fn(),
    };

    const source = new ManualShipmentEventSource();

    const view = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider cache={cache} source={source}>
          <StateProbe />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("connected")).toBeInTheDocument();

    // Initial connection should not be treated as a reconnect.
    expect(cache.invalidateLists).not.toHaveBeenCalled();
    expect(cache.invalidateObservedDetails).not.toHaveBeenCalled();

    act(() => {
      source.setConnectionState("disconnected");
    });

    expect(screen.getByText("disconnected")).toBeInTheDocument();
    expect(cache.invalidateLists).not.toHaveBeenCalled();

    act(() => {
      source.setConnectionState("connecting");
    });

    expect(screen.getByText("connecting")).toBeInTheDocument();
    expect(cache.invalidateLists).not.toHaveBeenCalled();

    act(() => {
      source.setConnectionState("connected");
    });

    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(cache.invalidateLists).toHaveBeenCalledTimes(1);
    expect(cache.invalidateObservedDetails).toHaveBeenCalledTimes(1);

    view.unmount();

    expect(source.getConnectionState()).toBe("disconnected");
  });
});
