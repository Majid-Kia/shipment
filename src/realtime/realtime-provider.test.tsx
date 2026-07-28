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

class ManualShipmentEventSource implements ShipmentEventSource {
  private eventListeners = new Set<(event: unknown) => void>();
  private connectionListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private state: RealtimeConnectionState = "disconnected";

  connect() {
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
  it("reports disconnect/reconnect and invalidates on reconnect", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const source = new ManualShipmentEventSource();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider source={source}>
          <StateProbe />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("connected")).toBeInTheDocument();
    invalidate.mockClear();
    act(() => source.setConnectionState("disconnected"));
    expect(screen.getByText("disconnected")).toBeInTheDocument();
    act(() => source.setConnectionState("connected"));
    expect(screen.getByText("connected")).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(source.getConnectionState()).toBe("disconnected");
  });
});
