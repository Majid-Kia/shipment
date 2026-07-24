const DEFAULT_EVENT_TTL = 10 * 60 * 1000;
const DEFAULT_EVENT_LIMIT = 1_000;

export class ReconciliationRegistry {
  private readonly confirmedVersions = new Map<string, number>();
  private readonly eventIds = new Map<string, number>();
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
  }

  private prune() {
    const cutoff = this.now() - this.eventTtl;
    for (const [eventId, seenAt] of this.eventIds) {
      if (seenAt >= cutoff) break;
      this.eventIds.delete(eventId);
    }
  }
}
