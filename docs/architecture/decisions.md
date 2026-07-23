# Initial Architectural Decisions

Status values are **Proposed** until implementation begins. These decisions optimize for the assignment's 15–20 hour limit and should be revisited if product/backend facts differ.

## ADR-001: Use feature-oriented modules with explicit domain and transport boundaries

- **Status:** Proposed
- **Decision:** Organize product code around the operations feature, with shared `domain`, `api`, `realtime`, `auth`, and `mocks` boundaries. UI consumes hooks/API contracts and never imports the mock database.
- **Rationale:** This keeps a focused vertical slice easy to navigate while separating business rules, server access, protocol reconciliation, and presentation. It avoids both a flat component directory and premature multi-package architecture.
- **Consequences:** Pure domain/reconciliation modules can be tested cheaply. Some feature-specific cache helpers stay near the feature rather than becoming misleading global abstractions.

## ADR-002: Assign state to TanStack Query, React Router, local React, and a narrow reconciliation registry

- **Status:** Proposed
- **Decision:** TanStack Query owns server snapshots; Router owns all navigable filters/page/selected shipment; local React owns transient interaction state; an injected non-rendering registry owns event high-water marks, deduplication, and pending mutation overlays.
- **Rationale:** Each state type has different lifecycle and consistency needs. Redux/Zustand would duplicate Query/Router state and add synchronization paths without solving a requirement.
- **Consequences:** The registry needs explicit reset/cleanup in tests and app lifecycle. Only connection UI subscribes to transport state, limiting render fan-out.

## ADR-003: Use server-side page-number pagination with 50 rows

- **Status:** Proposed
- **Decision:** MSW filters, sorts, summarizes, and slices the full repository; the UI uses TanStack Table manual pagination with a fixed page size of 50.
- **Rationale:** It bounds DOM/query work, gives stable shareable pages, and is substantially simpler than virtualization or infinite scrolling at this data volume.
- **Alternatives rejected:** Virtualization adds measurement/accessibility/test complexity to only 50 rows. Infinite scrolling weakens URL restoration and deterministic navigation.
- **Consequences:** Realtime membership/order changes are corrected by debounced refetch. At 100,000 records the real backend needs indexes and may move to cursor pagination.

## ADR-004: Treat the URL as the canonical filter and selection state

- **Status:** Proposed
- **Decision:** Canonical URL params are search, exception type, priority, status, origin, assigned state, page, and selected shipment. Defaults/invalid values are omitted or normalized.
- **Rationale:** Refresh, sharing, deep linking, and browser history work without duplicating state.
- **Consequences:** A typed codec is required. Debounced input keeps a local draft only until it commits to the URL. Filter commits reset page atomically.

## ADR-005: Validate untrusted boundaries with Zod

- **Status:** Proposed
- **Decision:** Validate URL params, API responses/request bodies, and realtime messages. Do not parse internal values repeatedly.
- **Rationale:** Realtime and mock HTTP are runtime boundaries where malformed data could corrupt a versioned cache. Selective use preserves clarity and performance.
- **Consequences:** Domain types should be inferred from or checked against schemas to avoid drift; validation errors become typed non-retryable application errors.

## ADR-006: Keep list and detail caches separate and patch them through one cache index

- **Status:** Proposed
- **Decision:** Use structured keys for paginated lists and per-ID details. A shared helper enumerates and immutably patches every cached representation containing an entity.
- **Rationale:** TanStack Query is not a normalized store, but realtime and optimistic behavior must remain consistent across list/detail representations.
- **Consequences:** Membership, ordering, totals, and summaries cannot always be derived from partial events, so relevant list queries are invalidated after immediate entity patches. Untouched references must be preserved.

## ADR-007: Use server versions plus an unversioned optimistic overlay

- **Status:** Proposed; **human review requested**
- **Decision:** Confirmed server entities retain their actual version. A pending mutation records its base version and renders an overlay without inventing a version. Newer events update the confirmed base while the overlay remains visible. Mutation settlement selects the highest authoritative version.
- **Rationale:** Incrementing an optimistic version can wrongly reject legitimate events; immediately replacing optimistic status with realtime status creates flicker and weakens optimistic UX.
- **Consequences:** Pending metadata is separate from cached domain data. The UI serializes mutations per shipment. Race behavior requires focused tests.

## ADR-008: Roll back snapshots, then reapply newer accepted realtime truth

- **Status:** Proposed
- **Decision:** Snapshot all affected query entries before mutation. On failure restore them, remove the overlay, then apply the latest accepted event whose version exceeds the snapshot version.
- **Rationale:** A plain rollback would erase server updates received while the request was pending. A plain invalidation would leave a false optimistic state until the network responds.
- **Consequences:** The mutation coordinator and realtime reconciler share a registry. A 409 also invalidates immediately.

## ADR-009: Use entity version high-water marks and a bounded event-ID LRU

- **Status:** Proposed
- **Decision:** Reject duplicate event IDs and events with versions less than or equal to the confirmed per-entity version. Retain at most 1,000 recent event IDs with TTL/LRU behavior.
- **Rationale:** Version checks handle reordering but do not identify exact retransmissions for diagnostics; event IDs handle duplicates but cannot reject a different stale event. Both are needed and must be bounded.
- **Consequences:** Events for uncached entities update metadata only. Reconnect invalidation provides eventual convergence.

## ADR-010: Simulate realtime behind a transport interface and share the MSW repository

- **Status:** Proposed
- **Decision:** Implement a small `ShipmentEventSource` interface with a timer-based browser source and a manual test source. The simulator mutates the same in-memory repository before emitting.
- **Rationale:** The UI/reconciler should not depend on timer implementation, and subsequent HTTP refetch must agree with emitted events.
- **Consequences:** Strict Mode-safe idempotent cleanup is mandatory. Tests avoid nondeterministic timers.

## ADR-011: Refetch on reconnect and for list-derived aggregates

- **Status:** Proposed
- **Decision:** Patch visible entities immediately, then debounce list invalidation when filter membership/order/summary may change. On reconnect invalidate lists and the open detail; poll more frequently while disconnected.
- **Rationale:** Partial events cannot reliably maintain every filtered cached page and aggregate, especially for invisible entities. Refetch makes the mock API the convergence authority.
- **Consequences:** There can be a short interval where a row is patched but totals/order await refetch. Existing content remains usable during errors.

## ADR-012: Optimize measured hot paths, not every component

- **Status:** Proposed
- **Decision:** Bound rows to 50, abort obsolete searches, preserve object references, batch event bursts, coalesce by entity, and memoize only the row hot path. Profile before adding more memoization.
- **Rationale:** These choices reduce algorithmic work and render fan-out. Blanket hooks obscure code and do not demonstrate a real optimization.
- **Consequences:** A reference-preservation test and React Profiler check are part of hardening.

## ADR-013: Use a capability map for mocked roles and enforce it in MSW too

- **Status:** Proposed
- **Decision:** VIEWER has view capability; OPERATOR additionally has acknowledge and assign. UI gates are backed by 403 behavior in mock mutation handlers.
- **Rationale:** The assignment requires clear acknowledgement that UI hiding is not authorization. Handler enforcement demonstrates the correct boundary without implementing authentication.
- **Consequences:** The mock role header is explicitly a demo mechanism. Production would validate authenticated claims server-side.

## ADR-014: No automatic mutation retries

- **Status:** Proposed
- **Decision:** Retry read queries at most twice only for network/5xx failures; never automatically retry mutations. Provide explicit user Retry.
- **Rationale:** Automatic mutation replay can duplicate intent and complicate version conflicts. Reads are safe and benefit from bounded recovery.
- **Consequences:** Transient mutation errors are visible sooner, followed by deterministic rollback.

## ADR-015: Keep scope to a testable vertical slice

- **Status:** Proposed
- **Decision:** Do not add Redux, Zustand, Axios, virtualization, Playwright, persistent offline queues, or elaborate design-system work unless must-haves finish early and evidence justifies them.
- **Rationale:** The weighted criteria reward architecture, cache/realtime correctness, performance reasoning, and tests more than breadth or polish.
- **Consequences:** Optional enhancements and production extensions are documented rather than half-built.

## ADR-016: Summary cards are filter-scoped and details selection is shareable

- **Status:** Proposed; **human review requested**
- **Decision:** Summary values describe the active filter set before pagination. `shipment=<id>` opens the detail sheet and survives refresh/share.
- **Rationale:** Filter-scoped cards explain the visible result set, and shareable selection is consistent with URL-owned navigable state.
- **Consequences:** The list response includes summary aggregates. If product wants global cards, use a separate summary query/key and leave filter changes out of it.

## ADR-017: Realtime payloads are partial; mutation responses are complete

- **Status:** Proposed; **human review requested**
- **Decision:** Realtime messages patch listed fields only and share a monotonic per-shipment version sequence with mutations. Successful mutation responses return a complete authoritative detail entity.
- **Rationale:** This matches the assignment's example payload and enables deterministic merging/settlement.
- **Consequences:** If the real protocol versions fields independently or sends full snapshots, reconciliation rules and schemas must change before implementation.

