import { afterEach, describe, expect, it, vi } from "vitest";

import { MockShipmentEventSource } from "@/mocks/realtime-source";
import type { RealtimeConnectionState } from "@/realtime/contracts";

afterEach(() => {
  vi.useRealTimers();
});

describe("MockShipmentEventSource", () => {
  it("connects and clears scheduled work when disconnected", async () => {
    vi.useFakeTimers();
    const source = new MockShipmentEventSource();
    const connectionListener =
      vi.fn<(state: RealtimeConnectionState) => void>();
    const eventListener = vi.fn<(event: unknown) => void>();
    source.subscribeToConnection(connectionListener);
    source.subscribe(eventListener);

    source.connect();
    expect(source.getConnectionState()).toBe("connecting");

    await vi.advanceTimersByTimeAsync(100);
    expect(source.getConnectionState()).toBe("connected");

    source.disconnect();
    expect(source.getConnectionState()).toBe("disconnected");

    await vi.advanceTimersByTimeAsync(100_000);
    expect(eventListener).not.toHaveBeenCalled();
    expect(connectionListener.mock.calls.map(([state]) => state)).toEqual([
      "connecting",
      "connected",
      "disconnected",
    ]);
  });
});
