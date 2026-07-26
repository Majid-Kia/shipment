import type { QueryClient } from "@tanstack/react-query";

import type { ShipmentRealtimeEvent } from "@/domain/shipment";

const DEFAULT_EVENT_TTL = 10 * 60 * 1000;
const DEFAULT_EVENT_LIMIT = 1_000;

export type OptimisticOverlay = {
  status?: "ACKNOWLEDGED";
  assignedTo?: { id: string; name: string };
};

interface PendingMutation {
  baseVersion: number;
  overlay: OptimisticOverlay;
  events: ShipmentRealtimeEvent[];
}

export class ReconciliationRegistry {
  private readonly confirmedVersions = new Map<string, number>();
  private readonly eventIds = new Map<string, number>();
  private readonly pendingMutations = new Map<string, PendingMutation>();
  private readonly eventLimit: number;
  private readonly eventTtl: number;
  private readonly now: () => number;

  constructor(
    eventLimit = DEFAULT_EVENT_LIMIT,
    eventTtl = DEFAULT_EVENT_TTL,
    now: () => number = Date.now,
  ) {
    this.eventLimit = eventLimit;
    this.eventTtl = eventTtl;
    this.now = now;
  }

  getConfirmedVersion(shipmentId: string) {
    return this.confirmedVersions.get(shipmentId);
  }

  recordConfirmedVersion(shipmentId: string, version: number) {
    const current = this.confirmedVersions.get(shipmentId) ?? 0;
    if (version > current) this.confirmedVersions.set(shipmentId, version);
  }

  beginMutation(
    shipmentId: string,
    baseVersion: number,
    overlay: OptimisticOverlay,
  ) {
    if (this.pendingMutations.has(shipmentId)) {
      throw new Error("A mutation is already pending for this shipment.");
    }
    this.pendingMutations.set(shipmentId, {
      baseVersion,
      overlay,
      events: [],
    });
  }

  getPendingMutation(shipmentId: string) {
    return this.pendingMutations.get(shipmentId);
  }

  recordPendingEvent(event: ShipmentRealtimeEvent) {
    const pending = this.pendingMutations.get(event.shipmentId);
    if (!pending) return;
    pending.events.push(event);
    pending.events.sort((left, right) => left.version - right.version);
  }

  finishMutation(shipmentId: string) {
    const pending = this.pendingMutations.get(shipmentId);
    this.pendingMutations.delete(shipmentId);
    return pending;
  }

  hasEvent(eventId: string) {
    this.prune();
    const seenAt = this.eventIds.get(eventId);
    if (seenAt === undefined) return false;
    this.eventIds.delete(eventId);
    this.eventIds.set(eventId, this.now());
    return true;
  }

  recordEvent(eventId: string) {
    this.prune();
    this.eventIds.set(eventId, this.now());
    while (this.eventIds.size > this.eventLimit) {
      this.eventIds.delete(this.eventIds.keys().next().value!);
    }
  }

  reset() {
    this.confirmedVersions.clear();
    this.eventIds.clear();
    this.pendingMutations.clear();
  }

  private prune() {
    const cutoff = this.now() - this.eventTtl;
    for (const [eventId, seenAt] of this.eventIds) {
      if (seenAt >= cutoff) break;
      this.eventIds.delete(eventId);
    }
  }
}

const registries = new WeakMap<QueryClient, ReconciliationRegistry>();

export function getReconciliationRegistry(queryClient: QueryClient) {
  let registry = registries.get(queryClient);
  if (!registry) {
    registry = new ReconciliationRegistry();
    registries.set(queryClient, registry);
  }
  return registry;
}
