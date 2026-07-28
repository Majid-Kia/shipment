# Architectural Decisions

These implemented decisions optimize for the assignment's 15–20 hour limit and
should be revisited if product or backend constraints differ.

## ADR-001: Use a hybrid feature-oriented structure with explicit layer ownership

- **Status:** Accepted
- **Decision:** Organize product code around `features/operations`, reusable
  `entities/shipment` and `entities/operator`, technical `shared` primitives,
  and explicit `realtime`, `auth`, `mocks`, and `app` boundaries. Operations
  separates `api`, `model`, and `ui`; shared code has no upward dependencies.
- **Rationale:** Ownership follows why code changes: Shipment and Operator
  contracts can serve other use cases, board filters/summaries remain
  Operations-specific, and transport/UI primitives remain reusable without
  becoming a dumping ground.
- **Consequences:** Entity modules cannot import features or app. Realtime
  consumes a narrow cache port implemented by Operations, avoiding the previous
  feature/realtime cycle while retaining the same query keys and reconciliation
  behavior. The application composition root injects the mock transport used by
  this take-home.

## ADR-002: Assign state to TanStack Query, React Router, local React, and a narrow reconciliation registry

- **Status:** Accepted
- **Decision:** TanStack Query owns server snapshots; Router owns only required shareable filters and page; local React owns selected shipment, details-sheet state, and other transient interaction state; an injected non-rendering registry owns event high-water marks, deduplication, pending mutation overlays, and ordered event patches received during a pending mutation.
- **Rationale:** Each state type has different lifecycle and consistency needs. Redux/Zustand would duplicate Query/Router state and add synchronization paths without solving a requirement.
- **Consequences:** The registry is scoped to a `QueryClient` and held weakly; tests use isolated clients or registries. Only connection UI subscribes to transport state, limiting render fan-out.

## ADR-003: Use server-side page-number pagination with 50 rows

- **Status:** Accepted
- **Decision:** MSW filters, sorts, summarizes, and slices the full repository; the UI uses a semantic table with page-number controls and a fixed page size of 50.
- **Rationale:** It bounds DOM/query work, gives stable shareable pages, and is substantially simpler than virtualization or infinite scrolling at this data volume.
- **Alternatives rejected:** Virtualization adds measurement/accessibility/test complexity to only 50 rows. Infinite scrolling weakens URL restoration and deterministic navigation.
- **Consequences:** Realtime membership/order changes are corrected by debounced refetch. At 100,000 records the real backend needs indexes and may move to cursor pagination.

## ADR-004: Treat the URL as the canonical required filter and pagination state

- **Status:** Accepted
- **Decision:** Canonical URL params are exactly search, exception type, priority, status, origin, assigned state, and page. Defaults/invalid values are omitted or normalized. Selected shipment and sheet open state are local React state.
- **Rationale:** Refresh, sharing, and browser history work for assignment-required filters without expanding URL scope beyond the requirement.
- **Consequences:** A typed codec is required. Debounced input keeps a local draft only until it commits to the URL. Filter commits reset page atomically. Refresh closes details; deep-linkable details are a possible future enhancement.

## ADR-005: Validate untrusted boundaries with Zod

- **Status:** Accepted
- **Decision:** Validate URL params, API responses/request bodies, and realtime messages. Do not parse internal values repeatedly.
- **Rationale:** Realtime and mock HTTP are runtime boundaries where malformed data could corrupt a versioned cache. Selective use preserves clarity and performance.
- **Consequences:** Domain types should be inferred from or checked against schemas to avoid drift; validation errors become typed non-retryable application errors.

## ADR-006: Keep list and detail caches separate and patch them through focused cache helpers

- **Status:** Accepted
- **Decision:** Use structured keys for paginated lists and per-ID details. Focused helpers enumerate and immutably patch every cached representation containing an entity.
- **Rationale:** TanStack Query is not a normalized store, but realtime and optimistic behavior must remain consistent across list/detail representations.
- **Consequences:** Membership, ordering, totals, and summaries cannot always be derived from partial events, so relevant list queries are invalidated after immediate entity patches. Untouched references must be preserved.

## ADR-007: Use server versions plus an unversioned optimistic overlay

- **Status:** Accepted
- **Decision:** Confirmed server entities retain their actual version. A pending mutation records its base version and renders an overlay without inventing a version. The mutation-owned field remains visible while pending; newer events update the confirmed base and unrelated fields remain visible underneath. Mutation settlement selects the highest authoritative version.
- **Rationale:** Incrementing an optimistic version can wrongly reject legitimate events; immediately replacing optimistic status with realtime status creates flicker and weakens optimistic UX.
- **Consequences:** Pending metadata is separate from cached domain data. Acknowledge and assign are serialized per shipment while different shipments may mutate concurrently. Race behavior requires focused tests.

## ADR-008: Roll back snapshots, then reapply newer accepted realtime truth

- **Status:** Accepted
- **Decision:** Snapshot all affected query entries before mutation. Retain accepted partial events during the mutation in version order. On failure restore snapshots, remove the overlay, then replay newer accepted events. On a delayed successful response, use the complete response as its versioned causal base and replay all later event patches, never replacing a higher-version entity wholesale with the older response.
- **Rationale:** A plain rollback would erase server updates received while the request was pending. A plain invalidation would leave a false optimistic state until the network responds.
- **Consequences:** The mutation coordinator and realtime reconciler share a registry. Tests must cover delayed-success response, 409 conflict, and 503 rollback races. A 409 also invalidates immediately.

## ADR-009: Use entity version high-water marks and a bounded event-ID LRU

- **Status:** Accepted
- **Decision:** Reject duplicate event IDs and events with versions less than or equal to the confirmed per-entity version. Retain at most 1,000 recent event IDs with TTL/LRU behavior.
- **Rationale:** Version checks handle reordering but do not identify exact retransmissions for diagnostics; event IDs handle duplicates but cannot reject a different stale event. Both are needed and must be bounded.
- **Consequences:** Events for uncached entities update metadata only. Reconnect invalidation provides eventual convergence.

## ADR-010: Simulate realtime behind a transport interface and share the MSW repository

- **Status:** Accepted
- **Decision:** Implement a small `ShipmentEventSource` interface with a timer-based browser source and a manual test source. The simulator mutates the same in-memory repository before emitting.
- **Rationale:** The UI/reconciler should not depend on timer implementation, and subsequent HTTP refetch must agree with emitted events.
- **Consequences:** Strict Mode-safe idempotent cleanup is mandatory. Tests avoid nondeterministic timers.

## ADR-011: Refetch on reconnect and for list-derived aggregates

- **Status:** Accepted
- **Decision:** Patch visible entities immediately, then debounce list invalidation when filter membership/order/summary may change. On reconnect invalidate lists and the open detail; poll more frequently while disconnected.
- **Rationale:** Partial events cannot reliably maintain every filtered cached page and aggregate, especially for invisible entities. Refetch makes the mock API the convergence authority.
- **Consequences:** There can be a short interval where a row is patched but totals/order await refetch. Existing content remains usable during errors.

## ADR-011A: Keep ordinary stale HTTP-response handling proportionate

- **Status:** Accepted
- **Decision:** Mock HTTP and realtime share one authoritative repository, which is updated before an event emits. Patch visible cached entities immediately; debounce list invalidation for membership/order/totals/summaries; invalidate relevant lists and the locally open detail on reconnect. Do not add a query-cache subscription framework solely to intercept every potential stale list/detail response unless implementation evidence requires it.
- **Rationale:** Query cancellation and refetch convergence are sufficient for the assignment's controlled transport. Complexity should stay concentrated on the explicitly required mutation/event race.
- **Consequences:** Mutation responses and realtime events remain version-aware. A production system with independently racing snapshot and event services may require versioned response envelopes and stronger query-boundary merging.

## ADR-012: Optimize measured hot paths, not every component

- **Status:** Accepted
- **Decision:** Bound rows to 50, abort obsolete searches, preserve object references, debounce list invalidation, and memoize only the row hot path. Profile before adding more memoization.
- **Rationale:** These choices reduce algorithmic work and render fan-out. Blanket hooks obscure code and do not demonstrate a real optimization.
- **Consequences:** Reference preservation is regression-tested. Automated React Profiler regression checks remain future work.

## ADR-013: Use a capability map for mocked roles and enforce it in MSW too

- **Status:** Accepted
- **Decision:** VIEWER has view capability; OPERATOR additionally has acknowledge and assign. UI gates are backed by 403 behavior in mock mutation handlers.
- **Rationale:** The assignment requires clear acknowledgement that UI hiding is not authorization. Handler enforcement demonstrates the correct boundary without implementing authentication.
- **Consequences:** The mock role header is explicitly a demo mechanism. Production would validate authenticated claims server-side.

## ADR-014: No automatic mutation retries

- **Status:** Accepted
- **Decision:** Retry read queries at most twice only for network/5xx failures; never automatically retry mutations. A user may explicitly issue another valid action after an error.
- **Rationale:** Automatic mutation replay can duplicate intent and complicate version conflicts. Reads are safe and benefit from bounded recovery.
- **Consequences:** Transient mutation errors are visible sooner, followed by deterministic rollback. A later explicit user action clears the previous error.

## ADR-015: Keep scope to a testable vertical slice

- **Status:** Accepted
- **Decision:** Do not add Redux, Zustand, Axios, virtualization, Playwright, persistent offline queues, or elaborate design-system work unless must-haves finish early and evidence justifies them.
- **Rationale:** The weighted criteria reward architecture, cache/realtime correctness, performance reasoning, and tests more than breadth or polish.
- **Consequences:** Optional enhancements and production extensions are documented rather than half-built.

## ADR-016: Summary cards are filter-scoped

- **Status:** Accepted
- **Decision:** Summary values describe the active filter set before pagination.
- **Rationale:** Filter-scoped cards explain the result set represented by the current controls.
- **Consequences:** The list response includes summary aggregates. If product wants global cards, use a separate summary query/key and leave filter changes out of it.

## ADR-017: Realtime payloads are partial; mutation responses are complete

- **Status:** Accepted as an explicit mock-protocol assumption
- **Decision:** Realtime messages patch listed fields only and share a monotonic per-shipment version sequence with mutations. Successful mutation responses return a complete authoritative detail entity.
- **Rationale:** The assignment does not fully specify this protocol. The assumption matches its example payload and enables deterministic merging/settlement.
- **Consequences:** If the real protocol versions fields independently or sends full snapshots, reconciliation rules and schemas must change before implementation.

## ADR-018: Exclude RESOLVED from the default board

- **Status:** Accepted as an explicit assignment assumption
- **Decision:** An absent status filter means `OPEN | ACKNOWLEDGED`. `RESOLVED` records remain available through explicit `status=RESOLVED`. Summary cards apply this default or the explicitly selected status before pagination.
- **Rationale:** “Currently have operational exceptions” is best represented by active and acknowledged exceptions, while explicit history access remains useful.
- **Consequences:** The absence of a status URL param has meaningful two-status semantics and must be encoded consistently in the URL codec, API handler, query key, and tests.

## ADR-019: Serialize mutations per shipment and enforce eligibility

- **Status:** Accepted as an explicit business-rule assumption
- **Decision:** At most one acknowledge or assign mutation may be in flight for a shipment; both controls are disabled for that ID until settlement, while other shipments remain independent. Acknowledge is valid only for OPEN. Assign is valid for OPEN and ACKNOWLEDGED and invalid for RESOLVED.
- **Rationale:** This avoids stacked optimistic overlays and supplies clear domain rules where the assignment is silent.
- **Consequences:** UI controls and MSW handlers both enforce eligibility. Invalid direct requests return 409 `INVALID_STATE`.

## ADR-020: Use Prettier for formatting

- **Status:** Accepted
- **Decision:** Use Prettier through the `format` and `format:check` scripts.
- **Rationale:** The assignment requires code formatting, and a deterministic script avoids relying on editor-specific behavior.
- **Consequences:** Formatting remains an explicit quality gate rather than an implicit editor setting.

## ADR-021: Use ESLint as the single linting tool

- **Status:** Accepted
- **Decision:** `npm run lint` runs ESLint with TypeScript, React Hooks, and Fast Refresh rules.
- **Rationale:** ESLint is a named assignment requirement, and a second linter would duplicate configuration and diagnostics without adding enough value here.
- **Consequences:** ESLint is the only lint gate, and narrow rule exceptions require an explanatory comment.
