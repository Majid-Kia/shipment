import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRealtimeConnectionState } from "@/realtime/realtime-context";
import { RealtimeProvider } from "@/realtime/realtime-provider";
import { ManualShipmentEventSource } from "@/realtime/shipment-event-source";

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
