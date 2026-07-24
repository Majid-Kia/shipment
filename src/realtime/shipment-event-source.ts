import { shipmentRepository } from "@/mocks/database";

export type RealtimeConnectionState =
  "disconnected" | "connecting" | "connected";

export interface ShipmentEventSource {
  connect(): void;
  disconnect(): void;
  subscribe(listener: (event: unknown) => void): () => void;
  subscribeToConnection(
    listener: (state: RealtimeConnectionState) => void,
  ): () => void;
  getConnectionState(): RealtimeConnectionState;
}

export class MockShipmentEventSource implements ShipmentEventSource {
  private eventListeners = new Set<(event: unknown) => void>();
  private connectionListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private state: RealtimeConnectionState = "disconnected";
  private updateTimer: ReturnType<typeof setTimeout> | undefined;
  private outageTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private shouldRun = false;
  private reconnectAttempt = 0;
  private recentEvents: unknown[] = [];

  connect() {
    if (this.shouldRun) return;
    this.shouldRun = true;
    this.setState("connecting");
    this.reconnectTimer = setTimeout(() => this.markConnected(), 100);
  }

  disconnect() {
    this.shouldRun = false;
    this.clearTimers();
    this.setState("disconnected");
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

  private markConnected() {
    if (!this.shouldRun) return;
    this.reconnectAttempt = 0;
    this.setState("connected");
    this.scheduleUpdate();
    this.outageTimer = setTimeout(
      () => this.simulateOutage(),
      randomBetween(45_000, 75_000),
    );
  }

  private scheduleUpdate() {
    this.updateTimer = setTimeout(
      () => {
        if (!this.shouldRun || this.state !== "connected") return;
        const event = shipmentRepository.applyRandomRealtimeUpdate();
        this.emit(event);
        this.recentEvents.push(event);
        if (this.recentEvents.length > 5) this.recentEvents.shift();

        if (Math.random() < 0.1) this.emit(event);
        if (Math.random() < 0.1 && this.recentEvents.length > 1) {
          this.emit(this.recentEvents[0]);
        }
        this.scheduleUpdate();
      },
      randomBetween(2_000, 5_000),
    );
  }

  private simulateOutage() {
    if (!this.shouldRun) return;
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.setState("disconnected");
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    const delay = Math.min(10_000, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(
      () => {
        if (!this.shouldRun) return;
        this.setState("connecting");
        this.markConnected();
      },
      delay + Math.floor(Math.random() * 250),
    );
  }

  private emit(event: unknown) {
    for (const listener of this.eventListeners) listener(event);
  }

  private setState(state: RealtimeConnectionState) {
    if (state === this.state) return;
    this.state = state;
    for (const listener of this.connectionListeners) listener(state);
  }

  private clearTimers() {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    if (this.outageTimer) clearTimeout(this.outageTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.updateTimer = this.outageTimer = this.reconnectTimer = undefined;
  }
}

export class ManualShipmentEventSource implements ShipmentEventSource {
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

  emit(event: unknown) {
    for (const listener of this.eventListeners) listener(event);
  }

  setConnectionState(state: RealtimeConnectionState) {
    this.state = state;
    for (const listener of this.connectionListeners) listener(state);
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
}

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}
