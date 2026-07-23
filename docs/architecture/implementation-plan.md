# Real-Time Shipment Exception Board — Implementation Plan

## 1. Purpose, scope, and success criteria

This plan describes a production-oriented vertical slice that can be completed in the assignment's 15–20 hour timebox. It covers the operations board, 5,000-record mock API, URL-synchronized filtering, shipment details, optimistic mutations, simulated realtime updates, role-based UI, resilience, tests, and required documentation. It intentionally does not include a real backend, authentication, deployment, pixel-perfect polish, or a full E2E suite.

Success means:

- `/operations` provides summary cards, all required filters, a paginated table, and a details sheet.
- A refreshed or shared URL reproduces valid filter and page state.
- VIEWER and OPERATOR capabilities are visibly distinct.
- Acknowledge and assignment are optimistic, fail about 20% of the time in normal mock mode, and roll back without discarding newer realtime information.
- Realtime events are validated, deduplicated, ordered by entity version, and reconciled with in-flight mutations deterministically.
- Rendering stays bounded to 50 table rows and affected entities.
- The required focused tests and integration flow pass.

## 2. Current repository baseline

The repository is a minimal scaffold, not an existing product:

- React 19, TypeScript 6, Vite 8, React Router 8, TanStack Query 5, TanStack Table 8, MSW 2, Zod 4, Vitest 4, React Testing Library, Tailwind 4, and shadcn/Base UI dependencies are installed.
- `src/App.tsx` renders an empty `div`; `src/main.tsx` only mounts it.
- Existing source code is presentation scaffolding: global Tailwind tokens, `cn`, and shadcn primitives for alert, dialog, badge, button, card, dropdown, input, select, sheet, skeleton, sonner, and table.
- TypeScript has strict unused/fallthrough checks and bundler resolution. Add `strict: true` explicitly so the intended contract is unambiguous.
- Oxlint only enables hooks and fast-refresh rules. There is no formatting command/config, TanStack Query lint rule, or test command/config despite installed dependencies.
- README is the Vite template. `docs/architecture/decisions.md` and `docs/progress.md` were empty at planning time.
- The workspace is not currently a Git worktree, so review will be file-based unless Git is initialized later.

Phase 0 addresses these gaps before feature code.

## 3. Chosen architecture

### 3.1 Data flow and boundaries

```text
URL search params ──parse/normalize──> ShipmentListParams
                                          │
UI feature hooks ─────────────────────────┼──> TanStack Query
                                          │         │
                                          │         v
                                    typed API client (fetch)
                                          │
                                          v
                                      MSW handlers
                                          │
                                    in-memory database
                                          ^
simulated event source -> validate -> reconciler -> Query cache + entity metadata
                                          ^
                                  mutation coordinator
```

Feature UI never imports the mock database or MSW handlers. Components call feature hooks; hooks call API functions; API functions validate untrusted boundaries and return domain data. Realtime and mutation paths share pure cache/reconciliation helpers so behavior does not diverge.

### 3.2 State ownership

| State category | Owner | Examples | Persistence/lifecycle |
|---|---|---|---|
| Server state | TanStack Query | list pages, totals/summary, details, operators | Query cache; fetched/refetched from API |
| URL state | React Router `searchParams` through a typed codec | search, exception type, priority, status, origin, assigned, page; selected shipment as `shipment` | Browser history; refresh/share safe |
| Ephemeral UI state | Nearest component | search input draft during debounce, assign popover open state, confirm dialog, focus state | Component lifetime only |
| Mock role | Small React context/provider | `VIEWER` or `OPERATOR` | In-memory; defaults to OPERATOR; role switch is demo-only |
| Realtime connection state | `useSyncExternalStore`-backed event client | connecting/connected/disconnected/reconnecting, last event time | Event-client lifetime; only connection indicator subscribes |
| Reconciliation state | Module-scoped `ReconciliationRegistry`, injected in tests | highest confirmed version per ID, bounded event-ID LRU, pending mutation records, deferred latest event | Non-rendering metadata; reset per app/test lifecycle |

No Redux or Zustand is needed. TanStack Query owns remote snapshots, Router owns navigable state, React owns small interaction state, and a narrow external registry owns protocol bookkeeping that should not cause renders.

## 4. Proposed module structure

```text
src/
  app/
    App.tsx                       router and top-level providers
    providers.tsx                 QueryClient, role, toaster, event subscription
    router.tsx                    / -> /operations redirect and route
    query-client.ts               shared defaults
  domain/
    shipment.ts                   domain types and immutable patch helpers
    operator.ts
    errors.ts                     discriminated AppError
    contracts.ts                  DTO/request/response types
    schemas.ts                    Zod schemas at runtime boundaries
  api/
    http-client.ts                fetch wrapper, JSON/error parsing, abort support
    shipments-api.ts
    operators-api.ts
  features/operations/
    OperationsPage.tsx            layout and state composition
    operations-search-params.ts   parse, defaults, serialize, canonicalize
    operations-query-keys.ts      key factory
    operations-queries.ts         query options/hooks
    operations-mutations.ts       optimistic mutation hooks/coordinator
    cache-index.ts                enumerate/patch detail and list caches
    components/
      SummaryCards.tsx
      ShipmentFilters.tsx
      ShipmentTable.tsx
      ShipmentRow.tsx
      Pagination.tsx
      ShipmentDetailsSheet.tsx
      PermissionGate.tsx
  realtime/
    event-source.ts               transport interface
    mock-event-source.ts          timer/reconnect simulation
    reconciliation-registry.ts    versions, event LRU, pending overlays
    reconcile-event.ts            pure accept/defer/reject algorithm
    realtime-provider.tsx         lifecycle and QueryClient bridge
  auth/
    role.ts
    role-provider.tsx
    permissions.ts
  mocks/
    browser.ts
    server.ts                     node MSW server
    handlers.ts
    database.ts                   indexed in-memory repository
    factories.ts                  deterministic 5,000+ seed
    scenarios.ts                  explicit test failures/events
  components/ui/                  existing presentation primitives only
  test/
    setup.ts
    render-app.tsx
    fixtures.ts
  main.tsx
```

Tests live beside behavior as `*.test.ts(x)` when unit-focused; the cross-feature integration test lives under `src/test/integration/`. Domain, API, mocks, and features may depend inward on domain contracts, but mock implementation must never be imported by feature code.

## 5. Domain models and API contracts

### 5.1 Domain models

```ts
type ShipmentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
type ShipmentPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ExceptionType =
  | "DELAYED"
  | "CUSTOMS_HOLD"
  | "DOCUMENT_MISSING"
  | "CONTAINER_NOT_ASSIGNED"
  | "PORT_CONGESTION";
type UserRole = "VIEWER" | "OPERATOR";

interface Operator {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  originPort: string;
  destinationPort: string;
  eta: string;                    // ISO-8601 instant
  exceptionType: ExceptionType;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  assignedTo: Operator | null;
  version: number;                // positive, monotonically increasing per entity
  updatedAt: string;              // ISO-8601 instant
}

interface StatusHistoryEntry {
  id: string;
  from: ShipmentStatus | null;
  to: ShipmentStatus;
  at: string;
  actor: string;
}

interface ShipmentEventRecord {
  eventId: string;
  type: "SHIPMENT_UPDATED" | "SHIPMENT_ACKNOWLEDGED" | "SHIPMENT_ASSIGNED";
  timestamp: string;
  summary: string;
  version: number;
}

interface ShipmentDetails extends Shipment {
  exception: { description: string; detectedAt: string };
  statusHistory: StatusHistoryEntry[];
  recentEvents: ShipmentEventRecord[]; // API guarantees newest first, maximum five
}
```

List items use `Shipment`; detail-only history/event fields do not inflate every list response. All timestamps remain strings in cache and are formatted at render time.

### 5.2 List and summary

`GET /api/shipments?page=1&pageSize=50&search=...&status=...&priority=...&exceptionType=...&originPort=...&assigned=true|false`

```ts
interface ShipmentListParams {
  page: number;
  pageSize: 50;
  search?: string;
  status?: ShipmentStatus;
  priority?: ShipmentPriority;
  exceptionType?: ExceptionType;
  originPort?: string;
  assigned?: boolean;
}

interface ShipmentSummary {
  totalExceptions: number;
  criticalExceptions: number;
  unassignedShipments: number;
  acknowledgedExceptions: number;
}

interface ShipmentListResponse {
  items: Shipment[];
  page: number;
  pageSize: number;
  total: number;
  summary: ShipmentSummary; // computed over the filtered result set before paging
}
```

List ordering is deterministic: `updatedAt desc`, then `id asc`. The API clamps no values; invalid inputs return 400. UI canonicalization prevents normal invalid requests. If a requested page becomes empty after data/filter changes, the UI replaces the URL with the last valid page and refetches.

### 5.3 Details and operators

- `GET /api/shipments/:id` → `ShipmentDetails`; 404 if absent.
- `GET /api/operators` → `{ items: Operator[] }`; operators are sorted by name.

### 5.4 Mutations

`POST /api/shipments/:id/acknowledge`

```ts
interface AcknowledgeShipmentRequest {
  expectedVersion: number;
}
interface ShipmentMutationResponse {
  shipment: ShipmentDetails; // authoritative complete entity
}
```

`POST /api/shipments/:id/assign`

```ts
interface AssignShipmentRequest {
  operatorId: string;
  expectedVersion: number;
}
```

Both endpoints:

- require mock role OPERATOR (403 otherwise);
- return 409 `VERSION_CONFLICT` when `expectedVersion` differs from the database version;
- increment version and `updatedAt` exactly once on success;
- return the authoritative full details entity;
- fail randomly with 503 about 20% of mutation requests in interactive mode;
- support deterministic forced success/failure in tests, bypassing randomness.

Mutations for the same shipment are serialized in the UI (both actions disabled while either is pending), which removes ambiguous stacked overlays within the timebox.

### 5.5 Error contract

```ts
type ErrorCode =
  | "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN"
  | "VERSION_CONFLICT" | "SERVICE_UNAVAILABLE" | "UNKNOWN";

interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
    details?: Record<string, string>;
  };
}

type AppError =
  | { kind: "http"; status: number; code: ErrorCode; message: string; retryable: boolean }
  | { kind: "network"; message: string; retryable: true }
  | { kind: "validation"; message: string; retryable: false }
  | { kind: "unknown"; message: string; retryable: false };
```

The fetch wrapper maps all thrown values into `AppError`. Zod validates API responses, mutation bodies in MSW, URL values, and realtime events. Internal objects already constructed by TypeScript are not repeatedly parsed.

### 5.6 Realtime event contract

```ts
interface ShipmentUpdatedEvent {
  eventId: string;
  shipmentId: string;
  version: number;
  type: "SHIPMENT_UPDATED";
  timestamp: string;
  payload: Partial<
    Pick<Shipment,
      "eta" | "exceptionType" | "priority" | "status" | "assignedTo" | "updatedAt"
    >
  >;
}
```

Schema constraints require a nonempty ID/event ID, positive integer version, valid timestamp, known type, at least one payload field, and strict known payload keys. `updatedAt` defaults to the event timestamp if omitted. Unknown/invalid events are ignored and logged in development.

## 6. Mock backend and 5,000-record strategy

- Generate 5,000 deterministic shipments once from a seeded PRNG. Use stable port/operator dictionaries, IDs, versions, timestamps, statuses, and exception types so tests and demos are reproducible.
- Store entities in `Map<string, ShipmentDetails>`. Keep arrays/maps for operators and IDs. At 5,000 rows, a linear scan for each list request is acceptable and realistically exercises server-side filtering without freezing the UI.
- The list handler normalizes search once, filters the repository, computes summary counts in the same pass, sorts using deterministic ordering, then slices the requested page.
- Search matches lowercase shipment number, origin, and destination. Exact enum/port/assignment filters are conjunctive.
- Add 150–400 ms seeded latency to reads and mutations. Random mutation failure is evaluated only after authorization/body/version checks.
- MSW runs in the browser and Node tests using the same handlers and database interface. Each test resets a smaller deterministic fixture database.
- The event simulator updates the same repository before emitting an event. Thus later reads are authoritative and reconnect invalidation converges.
- Scenario controls are test-only exports or request headers, never UI conditionals: force next mutation failure, emit exact event, disconnect, reconnect, and reset data.

## 7. Pagination, filtering, and search

Choose server-side page-number pagination with a fixed page size of 50 and TanStack Table in `manualPagination` mode.

Why:

- Only 50 rows are transferred/rendered, so 5,000 records never create a large DOM or client cache object.
- Filters and summaries are authoritative against the whole dataset, not just a loaded window.
- Page numbers are compact, understandable, shareable URL state and permit direct navigation.
- Virtualization adds scroll measurement, accessibility, sheet/focus, and test complexity without benefit when only 50 rows render.
- Infinite scrolling makes stable URL restoration, totals, “page 2” sharing, and realtime reorder behavior harder.

The text input has an ephemeral draft initialized from the URL. A 300 ms debounce commits a trimmed search value using `replace`; Enter commits immediately. Select filters commit immediately. Query changes retain the previous page visually with `placeholderData` while showing a subtle fetching state, except a materially different filter displays the old table dimmed/aria-busy only until the new response (never mislabel old rows as new results).

## 8. URL synchronization contract

Canonical URL keys: `search`, `exceptionType`, `priority`, `status`, `origin`, `assigned`, `page`, and `shipment`.

- Defaults are omitted: empty filters, `page=1`, and no selected shipment. `/operations?page=1` is replaced with `/operations`.
- Parse with a Zod-backed codec. Unknown query keys are preserved only if the application deliberately owns them; for this assignment, unknown keys are removed during canonicalization.
- Invalid enum/boolean/page values are replaced with defaults and the URL is canonicalized with history `replace`, preventing error loops.
- `page` is a positive integer. `shipment` must be a nonempty ID-like string; a nonexistent ID may remain while the detail panel presents 404 and a close action.
- Any committed search/filter change resets page to 1 atomically in the same URL update.
- Page changes use `push` so Back/Forward traverses pagination. Debounced search uses `replace` to avoid one history entry per keystroke; discrete filter changes use `push`.
- Selecting a row sets `shipment=<id>` with `push`; closing removes it. Refresh/share reopens the same detail sheet.
- The query key is produced from the normalized semantic params, never raw `URLSearchParams`, so parameter ordering cannot fragment the cache.
- If response `total` proves page exceeds `ceil(total/pageSize)`, replace with the last valid page (or 1 for zero results).

## 9. TanStack Query design

### 9.1 Query keys

```ts
const operationsKeys = {
  all: ["operations"] as const,
  shipments: () => [...operationsKeys.all, "shipments"] as const,
  list: (params: NormalizedShipmentListParams) =>
    [...operationsKeys.shipments(), "list", params] as const,
  details: () => [...operationsKeys.shipments(), "detail"] as const,
  detail: (id: string) => [...operationsKeys.details(), id] as const,
  operators: () => [...operationsKeys.all, "operators"] as const,
};
```

The normalized params object has stable field presence/order and includes page/pageSize.

### 9.2 Policies

| Query | `staleTime` | `gcTime` | Retry | Refetch |
|---|---:|---:|---|---|
| List | 15 s | 5 min | max 2 for network/5xx, exponential capped at 2 s; never 4xx/validation | on focus/reconnect if stale; 60 s interval while connected, 15 s while realtime disconnected |
| Detail | 30 s | 5 min | same | focus/reconnect; invalidate after reconnect |
| Operators | 10 min | 30 min | 2 for retryable failures | focus only when stale |

Global mutation retry is zero: automatic replay could duplicate intent, and the UI gives an explicit Retry action. Query functions consume TanStack Query's `AbortSignal`.

### 9.3 List/detail cache relationship

- List and detail remain separate server representations; there is no third normalized entity store.
- Opening details seeds `initialData` from any cached list item only as a temporary shape if the component supports it, but still fetches details immediately because history/events are absent.
- `patchShipmentEverywhere(id, updater)` enumerates active/inactive list queries under the list prefix and the detail query. It updates only caches containing the entity and preserves references for untouched pages, arrays, entities, and detail-only fields.
- Authoritative mutation responses patch matching cached entities; then affected lists are invalidated to correct membership, ordering, totals, and summaries. Detail is set directly and need not await refetch.
- Realtime events patch caches only when their entity is present; otherwise they update version metadata and the mock repository but create no arbitrary cache entries.

### 9.4 Background fetching

Initial load uses skeletons; subsequent fetching retains data and shows a nonblocking indicator. Background failures keep last good data and show an inline/toast warning rather than replacing the table. Reconnect invalidates list and open detail queries to recover missed events.

## 10. Optimistic mutation algorithm

One mutation coordinator handles acknowledge and assign with an operation-specific optimistic patch.

### 10.1 Snapshot and optimistic application

On mutate:

1. Check OPERATOR permission and that no mutation is already pending for this shipment.
2. Cancel all list queries under the list prefix and `detail(id)` so an older in-flight response cannot overwrite the optimistic state.
3. Read the highest confirmed entity snapshot from detail/list cache and its `version = baseVersion`. Do not increment the entity's confirmed version optimistically.
4. Capture every affected cache entry as `{ queryKey, previousData }`, including all cached list pages containing the ID and detail if present. This is the rollback snapshot.
5. Register `{ mutationId, shipmentId, baseVersion, overlay, snapshot, deferredEvent: null }`.
6. Apply the overlay (`status: ACKNOWLEDGED` or `assignedTo: selectedOperator`) to every affected cache. Preserve `version: baseVersion`; expose pending state separately from the registry/mutation hook so a fake version is never compared with server events.
7. Disable both row/detail actions for that shipment and send the request with `expectedVersion: baseVersion`.

### 10.2 Success

1. Treat the response as authoritative only after Zod validation.
2. Set confirmed snapshot/version to the response entity.
3. Compare any deferred realtime event: apply it only if `event.version > response.version`; otherwise discard it.
4. Remove the overlay/pending record.
5. Patch all matching list/detail caches with the resulting confirmed entity while preserving detail-only fields where needed.
6. Invalidate list queries in the background because status/assignment may change filter membership, ordering, and summary counts. Do not clear visible data.
7. Show success feedback.

### 10.3 Failure

1. Restore each recorded cache snapshot, but do not finish there.
2. Remove the optimistic overlay.
3. If a deferred valid realtime event exists and its version is greater than the restored confirmed version, apply it to the restored snapshot. This avoids rolling back over newer server truth.
4. Patch all matching caches with that reconciled result.
5. On 409, immediately invalidate detail and list queries; on other errors, normal background invalidation is optional but the rollback is immediate.
6. Show a clear error toast with retry action. The UI no longer displays the optimistic result unless the deferred server event independently establishes it.

Snapshots are per query key, not merely a single entity, so summaries/items can return to the exact prior state. Since mutation effects can alter membership, final invalidation is the authority for totals and pages.

## 11. Realtime architecture

### 11.1 Simulated transport

`ShipmentEventSource` exposes `connect`, `subscribe`, connection snapshot/subscription, and `disconnect`. The mock implementation:

- emits an update every 2–5 seconds for a random shipment;
- first updates the shared mock database and increments that shipment's version;
- deliberately re-emits the same event periodically and emits a delayed older event periodically to exercise defenses;
- simulates a temporary disconnect (for example, 8–15 seconds every 45–75 seconds), reports state, and reconnects with exponential backoff plus jitter capped at 10 seconds;
- pauses generation while disconnected, representing missed events, then relies on invalidation/refetch at reconnect.

Timer cleanup is idempotent for React Strict Mode. Tests use a manual event source rather than timers.

### 11.2 Event processing

For each raw message:

1. Parse with the strict Zod schema; reject invalid messages without touching cache.
2. If `eventId` is in the bounded 1,000-entry LRU/TTL set, reject as duplicate.
3. Record the event ID.
4. Find `confirmedVersion` in the reconciliation registry; if unknown, derive it from cached detail/list data. If neither exists, record the event's version as a high-water mark but do not fetch or render the entity.
5. Reject `version <= confirmedVersion` as stale/out of order.
6. If no mutation is pending, merge the partial payload into the confirmed entity in every cache where it exists, set version/timestamp, and update the high-water mark.
7. If a mutation is pending for the ID, defer the highest-version event and recompute the rendered entity as `new confirmed payload + optimistic overlay`; see conflict rules below.
8. If a realtime patch changes a field that controls the current list's membership/order/summary, patch the visible entity immediately if present and debounce a prefix invalidation (e.g. 250 ms). Refetch corrects moves/removals/counts without synchronous scans across 5,000 client records.

Events for non-visible shipments do not force queries or add rows. They update only the high-water mark; reconnect/background list fetch obtains their current server representation. Connection status is rendered separately, so timer/status changes do not rerender the table.

## 12. Concrete mutation-versus-realtime conflict resolution

### 12.1 Chosen rule

Server versions are authoritative. A pending mutation is an unversioned visual overlay based on `baseVersion`. Newer realtime data advances the confirmed base but the overlay remains visible until mutation settlement. Settlement then chooses the highest authoritative version. This provides stable optimistic UX without allowing rollback to erase newer server facts.

Only one mutation per shipment may be in flight. Realtime events are partial patches, so a deferred event is merged into the latest confirmed snapshot; when multiple arrive, accept them in increasing version order and retain the resulting latest confirmed snapshot.

### 12.2 Required race example: success

Initial:

```text
confirmed: { version: 17, status: OPEN, priority: HIGH }
rendered:  same
```

User acknowledges:

```text
pending:   { baseVersion: 17, overlay: { status: ACKNOWLEDGED } }
confirmed: { version: 17, status: OPEN, priority: HIGH }
rendered:  { version: 17, status: ACKNOWLEDGED, priority: HIGH } + pending indicator
```

Realtime event v18 `{ status: OPEN, priority: CRITICAL }` arrives:

```text
confirmed: { version: 18, status: OPEN, priority: CRITICAL }
deferred high-water event: v18
rendered:  { version: 18, status: ACKNOWLEDGED, priority: CRITICAL } + pending
```

The optimistic status overlay wins visually while pending, but the unrelated priority update is visible.

If mutation succeeds with authoritative v19 `{ status: ACKNOWLEDGED, priority: CRITICAL }`:

```text
response v19 > event v18
pending removed; event discarded as subsumed
cache: { version: 19, status: ACKNOWLEDGED, priority: CRITICAL }
```

If the mutation response is v18 rather than v19, equal-version conflicting authoritative representations indicate a protocol inconsistency. Prefer the mutation's complete response for the immediate entity, invalidate detail/list, and log the inconsistency; refetch decides. Never merge two different payloads claiming the same version silently.

If a v20 event arrived after v18 but before the v19 response, v20 is retained and applied after response:

```text
cache: merge(response v19, event payload v20), version 20
```

### 12.3 Required race example: failure

Use the same state through arrival of v18. If the acknowledge request fails with 503:

1. Restore the v17 snapshot (`OPEN`, `HIGH`).
2. Remove the acknowledge overlay.
3. Reapply the accepted v18 server event because 18 > 17.

Final cache:

```text
{ version: 18, status: OPEN, priority: CRITICAL }
```

The cache does **not** show ACKNOWLEDGED, so there is no false success, and it does **not** fall back to priority HIGH, so rollback does not lose realtime truth.

If the v18 event instead said `{ status: RESOLVED }`, rendered status remains optimistically ACKNOWLEDGED only until settlement. On failure it becomes RESOLVED v18; on a successful mutation response v19 it becomes the server-returned status. On 409, remove the overlay, apply the latest accepted event, and refetch immediately.

### 12.4 Other ordering cases

- Duplicate event ID: ignore even if delivered twice.
- Different ID but same/lower version: ignore because entity version is already equal/higher.
- v19 then v18: accept v19, reject v18.
- Event v18 for uncached shipment: update high-water metadata only; do not inject it into the current page.
- Late list response v17 after accepted v18: query cancellation reduces this race; a query-cache subscription/response merge rejects an entity whose version is below its registry high-water mark and schedules refetch rather than displaying regression.
- Reconnect after missed events: invalidate visible list/detail; API snapshots replace cache only when their versions are at least the known confirmed versions. If the registry is ahead of an unexpectedly stale response, retain current data and refetch/log.

## 13. Rendering and performance

### 13.1 At 5,000 shipments

- Filtering/sorting/pagination run in the MSW repository, not in React render; only 50 rows reach the table.
- The fixed-size result and manual TanStack Table modes avoid building a 5,000-row model.
- Query keys use canonical params. Search is debounced and prior requests are aborted.
- Column definitions are static module constants. Date/label formatters are created once, not per cell.
- `ShipmentRow` is memoized by shipment object identity and pending flags only because realtime updates are a demonstrated hot path. Cache patchers preserve every untouched entity/page reference, so one visible update rerenders one row.
- Do not blanket `memo`, `useMemo`, or `useCallback`; use React Profiler before further optimization.
- Batch/buffer burst events into one animation-frame flush and coalesce by shipment ID/highest version. Debounce list invalidation so a burst produces one refetch.
- Events for invisible rows do not mutate active list data. Connection state subscriptions are isolated from the table.
- Opening detail fetches one entity and does not invalidate the page.
- Summary counts come from the list response. Realtime field changes trigger a debounced authoritative refetch rather than risky client-wide count derivation.
- Development validation target: filter interaction and sheet opening show no visible freeze; a 20-event burst changes only affected visible row commits. Record profiler evidence in README if time permits.

### 13.2 At 100,000 shipments

Keep server-side pagination/filter/sort and change the mock linear scan to backend database indexes/full-text search. Use cursor pagination if concurrent inserts make page-number consistency important, and return summary aggregates from indexed/materialized queries. The browser should still never receive all entities.

For high event rates, subscribe server-side only to the current filter/visible IDs or send invalidation hints; introduce a normalized entity cache/event worker and rate-limit/coalesce updates. Use virtualization only if product requirements increase page size or require continuous scrolling. Add server-issued resume tokens/event sequence checkpoints on reconnect, observability for event lag, and contract tests against a real backend.

## 14. Permission model

```ts
const capabilities = {
  VIEWER: new Set(["shipment:view"]),
  OPERATOR: new Set(["shipment:view", "shipment:acknowledge", "shipment:assign"]),
};
```

- Both roles can load/search/filter lists and view details.
- VIEWER sees action locations disabled or absent with explanatory text (“Operator role required”); tests assert no actionable acknowledge/assign controls.
- OPERATOR can acknowledge only OPEN shipments and assign any non-RESOLVED shipment (assumption to review).
- UI permission checks are UX only. MSW also rejects mutation requests for VIEWER to demonstrate the production boundary; a real backend must derive identity/claims from authenticated credentials and enforce policy independently.
- A small role switch in the demo header is clearly labelled “Mock role”; it is not authentication.

## 15. Error and resilience behavior

| Failure | Behavior | Recovery |
|---|---|---|
| Initial list failure | Board shell/filters remain; table area shows accessible error alert, no false empty state | Retry button invokes query refetch; automatic retry only for retryable errors |
| Background list failure | Keep last successful rows/summary; nonblocking stale-data warning | Retry/refocus/reconnect |
| Empty list | Explicit “No shipments match these filters” with clear-filters action | Change/clear URL filters |
| Detail failure | Sheet stays open with its own error state; board remains usable | Retry details or close sheet |
| Operators failure | Details still render; assignment control shows error/Retry | Refetch operators |
| Mutation failure | Immediate reconciliation-aware rollback; clear toast with action and no false success | Manual Retry; 409 also refetches |
| Realtime disconnect | Amber connection indicator; existing data/actions remain usable; no blocking overlay | Exponential reconnect; invalidate list/open detail on reconnect; faster polling while offline |
| Invalid realtime/API payload | Ignore unsafe payload, log in development, retain last good cache | Refetch on next scheduled trigger |

Alerts use `role="alert"` where appropriate; loading/disabled states have text/aria semantics, and focus returns from the sheet.

## 16. Test matrix mapped to requirements

Use Vitest, React Testing Library, `user-event`, jest-dom, Node MSW server, fake timers only for debounce/reconnect tests, and deterministic fixtures. Tests must assert behavior, not implementation details.

| Requirement | Planned test |
|---|---|
| URL filter synchronization (required) | Render at a populated URL; controls and page reflect it. Change each filter/search; URL updates and page resets. Refresh by remounting from same history preserves state. |
| URL invalid/default handling | Invalid enum, boolean, and page canonicalize to omitted defaults; defaults are omitted; discrete changes/back-forward work. |
| Shared detail URL | `shipment=id` opens detail sheet; close removes it; 404 is isolated. |
| Permission rendering (required) | VIEWER cannot invoke acknowledge/assign and sees explanation; OPERATOR sees valid actions. Direct VIEWER mutation returns 403 in handler test. |
| Duplicate/out-of-order rejection (required) | Pure reconciler accepts v18 once, rejects same event ID, rejects v17/v18 after high-water v18, and leaves cached entity/reference unchanged. |
| Existing realtime update | Valid v18 patches only matching visible row/detail and preserves other object references. |
| Non-visible event | Event advances metadata but does not add a row or trigger detail fetch. |
| Disconnect/reconnect | Status changes, board remains usable, reconnect invalidates list/open detail, timers clean up. |
| List states | Skeleton on initial load, empty state for zero total, error plus Retry on forced failure, stale data retained on background error. |
| Details requirements | Sheet renders shipment/exception/assignment/history and exactly newest five events; detail loading/error isolated. |
| Search/filter correctness | MSW repository filters all required fields before paging, returns deterministic totals/summary/order. |
| Pagination/performance boundary | Handler returns max 50 rows from 5,000; page key differs; page overflow canonicalizes. |
| Acknowledge optimistic success | Status changes immediately without fake version; authoritative response replaces it and lists invalidate. |
| Assign optimistic success | Operator changes immediately in all cached representations, then server entity settles. |
| Mutation failure rollback | Exact cache snapshots restore; toast appears; pending state clears. |
| Required integration flow | Load → apply filter → open detail → acknowledge → forced API failure → see optimistic state while promise held → reject → verify row/detail rollback and error. |
| Mutation/realtime success race | Base v17, optimistic acknowledge, event v18, success v19: pending overlay plus event fields while waiting, then authoritative v19. |
| Mutation/realtime failure race | Same sequence with failure: rollback v17 then reapply v18; final cache is OPEN/CRITICAL v18. |
| Multiple/out-of-order race events | v19 then v18 during mutation retains v19; later success v20 wins or success v18 is followed by retained v19 according to version. |
| Mutation 409 | Overlay removed, newer event preserved, query invalidated/refetched. |
| API/event validation | Malformed response/event produces typed validation handling and no cache corruption. |
| Query policy | Unit test retry predicate: network/5xx bounded retry; 4xx/validation no retry; mutations no retry. |
| Cache relationship | Patch helper updates every containing list/detail cache and preserves unrelated references. |
| Summary cards/table columns | Component test asserts four required summaries and all nine required column headings. |

Three minimum tests are not treated as the goal; the high-risk reconciliation helpers receive focused unit coverage, while one integration test proves composition.

## 17. Phased implementation sequence (15–20 hours)

### Phase 0 — Tooling and executable shell (1–1.5 h)

Work: add router/query providers, Vitest jsdom/setup, MSW worker/server bootstrap, `test`, `test:watch`, `typecheck`, `format`, and `format:check` scripts; configure formatter (Prettier as a dev-only tool or document an existing formatter choice), strengthen TS strictness and query lint rules.

Definition of done: empty `/operations` route mounts under production and test providers; `npm run build`, lint, typecheck, format check, and one smoke test pass.

Review independence: infrastructure-only change, no polished UI required.

### Phase 1 — Contracts and mock backend (2–2.5 h)

Work: domain/contracts/Zod schemas, deterministic factory/database, list/detail/operators/mutation handlers, typed fetch client, test scenario controls.

Definition of done: handlers expose 5,000 records, required filters/paging/summary/details/operators, authorization/version checks, and controllable 20% mutation failure.

Validation: repository/handler tests for filters, paging, contracts, 403/404/409/503, and five-event limit.

### Phase 2 — URL state and server-state board skeleton (2–2.5 h)

Work: URL codec, query keys/options, list query, filter controls, summary cards, loading/empty/error states, manual pagination.

Definition of done: every required filter drives the URL and request; refresh/share behavior works; only 50 rows render; summary states are present.

Validation: URL, invalid/default, list state, query-key, and filtering tests.

### Phase 3 — Table and details vertical slice (2–2.5 h)

Work: typed TanStack Table columns, row component, selection in URL, details sheet/query, status history/five events, operators query, permission provider/gates.

Definition of done: all nine columns display, selectable row opens refresh-safe details, roles produce correct controls.

Validation: details, permission, 404 isolation, and required content tests; keyboard/focus smoke check.

### Phase 4 — Optimistic mutations without realtime (2–2.5 h)

Work: cache index/patch helpers, snapshot registry, acknowledge/assign hooks, failure/success/409 handling, toast feedback, action serialization.

Definition of done: both actions update row/detail immediately, settle to authoritative data, and exactly roll back every affected cache on forced failure.

Validation: cache helper tests, acknowledge/assign success/failure, 409, and required integration test.

### Phase 5 — Realtime and conflict reconciliation (3–3.5 h)

Work: transport interface/manual test source/mock timers, event schemas, LRU/high-water registry, pure reconciliation, QueryClient bridge, disconnect/reconnect, batching, mutation deferral rules.

Definition of done: valid updates render; duplicate/stale/non-visible events behave as specified; reconnect converges; v17/v18 success and failure races produce documented cache states.

Validation: pure unit matrix plus integration tests for visible patch, non-visible event, reconnect, success race, failure race, and reference preservation.

### Phase 6 — Hardening, profiling, documentation (2–3 h)

Work: run full checks; test background failures and accessibility states; profile event burst/filter/sheet; fix measured hot paths; replace README with setup, architecture, all required answers, tradeoffs, AI-use note, time/incomplete items.

Definition of done: build/lint/typecheck/format/tests pass; no visible freeze in manual 5,000-row scenario; README answers every assignment question; known limitations and actual time are recorded.

Validation: clean-install command path when feasible, full suite, manual role/failure/disconnect checklist, React Profiler evidence.

Estimated total: 14.5–18.5 hours, leaving up to 1.5 hours of contingency inside the 20-hour ceiling.

## 18. Scope priorities and timebox trade-offs

### Must-have

- All required board content, filters, URL persistence, 5,000 records, pagination, list/detail states.
- Typed API/domain boundaries and structured query/cache policies.
- Both optimistic mutations, 20% mock failures, exact rollback, permissions.
- Validated realtime with duplicates, ordering, invisibility, disconnect/reconnect.
- Concrete version-based mutation/realtime conflict implementation and tests.
- Required three focused tests and failure integration flow.
- Build/lint/format/test scripts and assignment README answers.

### Optional, only after must-haves

- Mock role selector polish and realtime activity badge.
- React Profiler notes or small performance benchmark.
- Playwright smoke test.
- Dark theme, responsive refinements, richer event animation.
- Event diagnostic panel or developer controls.

### Deliberate trade-offs

- Page-number pagination over virtualization/infinite scrolling for stable URL semantics and lower risk.
- Fixed page size 50; no user-configurable size.
- Linear mock filtering at 5,000 rather than elaborate indexes; production scaling is documented.
- One in-flight mutation per shipment instead of stacked optimistic operations.
- Refetch for list membership/order/summary convergence rather than attempting perfect partial-event client aggregation.
- No persistent offline mutation queue; disconnected realtime does not block HTTP mutations.
- No real auth, backend, E2E suite, i18n, full mobile treatment, or production telemetry.
- Zod only at untrusted boundaries to avoid duplicated types/validation overhead.

## 19. Requirement traceability checklist

| Assignment requirement | Planned implementation | Verification |
|---|---|---|
| Single-page operations dashboard | `/operations` route/layout | Board component test |
| Four suggested summary cards | Filtered response `summary` + cards | Heading/value test |
| Nine minimum table columns | Typed TanStack Table definitions | Column test |
| Details drawer/side panel | URL-driven shadcn Sheet | Detail test |
| At least 5,000 shipments | Seeded MSW repository | Handler count test |
| Responsive list/filter/realtime/detail/update | 50-row server page, abort/debounce, immutable targeted patch, batching | Boundary tests + profiler/manual check |
| Text search | URL codec + API search | URL and handler tests |
| Exception filter | `exceptionType` | URL and handler tests |
| Priority filter | `priority` | URL and handler tests |
| Status filter | `status` | URL and handler tests |
| Origin filter | `origin` URL / `originPort` API | URL and handler tests |
| Assigned/unassigned filter | tri-state `assigned` | URL and handler tests |
| Refresh/share preserves filters | Router-owned canonical params | Remount/history test |
| Structured query keys | `operationsKeys` factory | Unit test/review |
| Loading/empty/error states | Per-query accessible states | Component tests |
| Retry/cache policy | Typed predicates and documented stale/gc times | Predicate tests/config review |
| Background refetch | focus/reconnect/interval policies | Config and reconnect test |
| Server/local state separation | Query/URL/component/registry ownership | Architecture review |
| Optimistic acknowledge | overlay + versioned request | Success/failure tests |
| Optimistic assign | overlay + versioned request | Success/failure tests |
| ~20% mutation failure | Seeded MSW branch | Handler distribution/specific forced tests |
| Rollback, message, consistent cache | keyed snapshots + deferred-event reapply + toast | Integration/race tests |
| Periodic random realtime updates | mock event source updates repository | Fake-timer/source test |
| Existing shipment updates | shared cache patcher | Realtime component test |
| Duplicate events | event-ID LRU | Reconciler unit test |
| Out-of-order/stale versions | per-ID high-water version | Reconciler unit test |
| Non-visible shipment events | metadata only, no forced fetch | Unit/integration test |
| Connection loss/reconnection | status store, backoff, reconnect invalidation | Fake-timer test |
| Avoid whole-table rerender | reference-preserving patches + memoized hot row | Reference test + profiler |
| Mutation/realtime conflict | server-version overlay algorithm | v17/v18 success/failure tests |
| Shipment information | `ShipmentDetails` sheet | Detail content test |
| Exception details | detail-only exception object | Detail content test |
| Current assignment | detail entity/operator | Detail content test |
| Status history | detail history | Detail content test |
| Five recent events | API capped newest-first | Handler/component test |
| VIEWER capabilities | permission map and gates | Permission test |
| OPERATOR capabilities | permission map and mutations | Permission/mutation test |
| Backend authorization caveat | MSW 403 + README production explanation | Handler test/docs review |
| Required URL test | focused Router test | Test suite |
| Required permission test | component/provider test | Test suite |
| Required event rejection test | pure reconciler test | Test suite |
| Required integration flow | forced deferred 503 flow | Test suite |
| React/TS/Vite/router/ESLint/format/tests/mock | existing stack + Phase 0 scripts/config | CI-like command run |
| README setup/test/architecture/limitations/time/incomplete/tradeoffs | Phase 6 README replacement | Documentation checklist |
| All ten README questions | Dedicated answer section | Documentation checklist |
| AI usage disclosure | Brief README note | Documentation checklist |
| Out-of-scope exclusions | Not implemented | Scope review |

## 20. Ambiguities, assumptions, risks, and human review gates

### Ambiguities found

- Whether summary cards describe the filtered result set or all shipments.
- Whether `RESOLVED` shipments remain “current exceptions” and appear by default.
- Search fields, sorting behavior, default role, mutation version semantics, and assignment eligibility are unspecified.
- Whether realtime event payloads are full entities or partial patches, and whether event versions share the mutation endpoint's sequence.
- Whether selected detail should be URL state; only filters are explicitly required.
- Whether a realtime event should override an optimistic field visually before mutation settlement.
- The provided document contains encoding artifacts for arrows, but intended flows are clear.

### Assumptions made

- Summary cards reflect the active filters before pagination.
- Default view includes OPEN, ACKNOWLEDGED, and RESOLVED because no default status restriction is stated.
- Search covers shipment number, origin, and destination; default order is latest update first.
- Event and mutation versions form one monotonic per-shipment server sequence.
- Realtime payloads are partial patches; mutation responses are complete authoritative details.
- OPERATOR may acknowledge only OPEN and assign any non-RESOLVED shipment.
- Selected shipment belongs in the URL for refresh/share quality.
- MSW and the event source share one repository, so refetch can converge.

### Highest-risk technical areas

1. Correct rollback when newer realtime data arrives during a pending mutation.
2. Keeping multiple filtered list caches, detail cache, summaries, and membership consistent.
3. Preventing stale query responses from regressing a version already observed via realtime.
4. Making the simulator deterministic and cleanup-safe under Strict Mode and tests.
5. Completing robust integration tests without consuming the UI-polish time budget.

### Human decisions required before implementation

- Confirm whether summaries are global or filter-scoped.
- Confirm whether RESOLVED rows are included by default and how long they remain on the board.
- Approve the “optimistic overlay remains visible while newer server fields merge underneath” conflict UX.
- Confirm a single in-flight mutation per shipment is acceptable.
- Confirm partial realtime payload and globally monotonic per-entity version assumptions.
- Confirm assignment/acknowledgement eligibility and whether details selection should be shareable URL state.
- Decide whether adding Prettier as a dev dependency is acceptable or whether another formatter is preferred.

