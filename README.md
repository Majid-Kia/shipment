# Real-Time Shipment Exception Board

A production-oriented React and TypeScript vertical slice for monitoring 5,000
shipment exceptions, filtering and paging them, inspecting details, applying
optimistic operator actions, and reconciling simulated realtime updates.

## Setup and commands

Requirements: Node.js `^20.19.0` or `>=22.12.0`, plus npm.

```bash
npm ci
npm run dev
```

Vite prints the local development URL. The default mocked role is `OPERATOR`;
the role control can switch to `VIEWER`. MSW and the realtime simulator start
with the app in development; there are no environment variables, separate
backend process, or hidden setup steps.

Validation:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

`npm run lint` runs ESLint with TypeScript, React Hooks, and Fast Refresh rules.

## Architecture overview

The application is a feature-oriented single-page application:

```text
URL filters -> operations query hooks -> TanStack Query -> typed API client
                                                        -> MSW repository
MSW repository -> mock event source -> validated reconciler -> query cache
local selection/role/connection state --------------------> React UI
```

```text
src/
  app/                  application composition, router, QueryClient
  api/                  HTTP client, API contracts, boundary validation
  auth/                 role context and capability rules
  components/ui/        presentation primitives
  domain/               shipment model, constants, core schemas
  features/operations/  board UI, queries, mutations, cache coordination
  mocks/                MSW, repository, scenarios, realtime simulator
  realtime/             protocol contracts, registry, reconciliation
  test/                 shared test setup and rendering helpers
```

- `src/domain` contains the shipment model, constants, and core Zod schemas.
- `src/api` owns typed HTTP access, request/response schemas, and error
  normalization.
- `src/mocks` owns the deterministic 5,000-record repository, MSW handlers,
  scenarios, and timer-based realtime implementation.
- `src/realtime` owns transport, connection state, event validation,
  deduplication, version ordering, and cache reconciliation.
- `src/features/operations` owns the board UI, query keys/hooks, optimistic
  mutations, and mutation settlement coordinator.
- `src/auth` owns the mocked role and capability model.

TanStack Query owns server state. URL search parameters own shareable filters
and pagination. Component state owns ephemeral details selection and form
values. React contexts own the mocked role and connection status. The
non-rendering reconciliation registry owns event high-water marks, the bounded
event-ID LRU, and in-flight mutation metadata.

## Realtime and mutation consistency

Realtime messages are strict partial patches. The reconciler validates each
message, rejects a duplicate `eventId`, then rejects any version less than or
equal to the highest confirmed version for that shipment. An accepted event
patches only list/detail caches where the entity already exists. Non-visible
shipments advance metadata without creating cache entries. Unrelated row object
references are preserved, and memoized rows prevent a single update from
rerendering every row.

Server versions are authoritative. An optimistic mutation is an unversioned
visual overlay over a confirmed base version:

1. Snapshot every affected cache and register the overlay/base version.
2. Retain accepted events received while the mutation is pending in version
   order. Their unrelated fields render immediately; the mutation-owned field
   remains overlaid.
3. On success, start with the complete mutation response and replay every
   retained event newer than the response.
4. On failure, restore the snapshots, remove the overlay, and replay every
   retained event newer than the snapshot.

This makes both success and failure deterministic without allowing an older
HTTP response or rollback to erase newer server truth. A `409` also invalidates
the open detail. Lists are invalidated after settlement and after debounced
realtime changes so membership, order, totals, and summaries converge.

## Resilience and performance

Read requests retry only retryable network/5xx failures, at most twice, with
bounded exponential delay. Validation and 4xx errors are not retried.
Mutations are never automatically retried. Initial, background, detail,
operator, and mutation failures retain unaffected UI and expose actionable
messages. When realtime disconnects, existing data and actions remain usable,
the polling interval shortens from 60 to 15 seconds, and reconnect invalidates
lists plus the observed detail query.

The mock API filters, summarizes, sorts, and paginates server-side. Only 50 rows
are transferred/rendered. Searches are debounced and obsolete requests are
abortable. Realtime cache work scans only cached pages, preserves unaffected
references, batches list invalidation, and memoizes only the row component.
The mock repository's linear scan is acceptable for 5,000 in-memory records;
100,000 production records would require indexed backend queries, cursor
pagination, and likely row virtualization for larger client windows.

## Assignment questions

### How did you separate server state from local UI state?

Remote shipments/operators live only in TanStack Query. Filters/page live in
the router URL. Sheet selection and assignment input are component state.
Role/connection state use narrow contexts. Protocol bookkeeping lives outside
React in the reconciliation registry.

### Why this folder and module structure?

The operations feature keeps its UI and workflows together while domain, API,
mock transport, realtime protocol, and authorization remain independent
boundaries. Reconciliation is directly testable and neither components nor API
code import the mock database.

### How are realtime events reconciled with the query cache?

Validated, accepted partial patches update only cached representations that
already contain the shipment. Detail and every matching cached list receive the
same version/timestamp. List invalidation handles membership, order, and
aggregate convergence.

### How are duplicate and out-of-order events handled?

A TTL/LRU set retains at most 1,000 recent event IDs. Per-shipment confirmed
version high-water marks reject stale or equal versions. Both checks occur
before cache mutation.

### How does optimistic rollback work?

Every affected query entry is snapshotted before the overlay. Failure restores
those exact references, then replays accepted newer realtime patches in version
order so rollback cannot discard later server truth.

### How are mutation/realtime conflicts resolved?

The complete mutation response is the authoritative causal base. Later partial
events are replayed over it. While pending, the mutation-owned field remains an
unversioned overlay and unrelated event fields remain visible. Success removes
the overlay after response-plus-event reconstruction; failure removes it after
snapshot-plus-event reconstruction.

### What changes for 100,000 shipments?

Filtering, sorting, and summaries move to an indexed persistent backend with
cursor pagination. Event routing would use a broker and durable
sequence/checkpoint semantics. The browser would retain bounded pages,
virtualize larger windows, and receive versioned response envelopes to merge
independently racing snapshot and event services.

### How would production authentication and authorization be introduced?

An OIDC client would obtain short-lived tokens and derive display capabilities
from verified claims. The API gateway/backend would validate issuer, audience,
expiry, scopes, and tenant access for every request. UI capability gates would
remain convenience only; backend authorization would be authoritative.

### Which timebox trade-offs were accepted?

Page-number pagination was chosen over infinite scrolling/virtualization;
filtered aggregate convergence uses debounced refetch rather than maintaining
every cached result perfectly; the mock repository scans 5,000 records; only
one mutation per shipment is allowed; there is no offline mutation queue,
production backend, or full E2E suite.

### What would improve with one additional working day?

Add Playwright smoke coverage, an automated React Profiler regression harness,
browser-based accessibility auditing, chunk splitting, and more exhaustive
property-based reconciliation tests.

## Known limitations and incomplete items

- The backend, authentication, database, production WebSocket, deployment,
  internationalization, full mobile polish, and full E2E suite are intentionally
  out of assignment scope.
- Realtime and HTTP share one in-memory repository. Independently deployed
  snapshot/event services would need versioned response envelopes or stronger
  server checkpoints.
- List totals/order may be briefly stale between an event and the debounced
  authoritative refetch.
- The production bundle exceeds Vite's default 500 kB warning threshold; route
  splitting was deferred because this is a single-screen assignment.
- No required functional item is knowingly incomplete.

Approximate implementation time: **18 hours** across architecture, contracts,
mock backend, board/details UI, mutations, realtime reconciliation, tests,
hardening, and documentation.

## AI-assisted development disclosure

AI-assisted development was used to inspect the repository, implement and
refactor code, draft tests/documentation, and run validation. The resulting
architecture and generated changes were reviewed against the approved decisions
and assignment specification; race behavior is covered by explicit deterministic
tests. The submitter remains responsible for understanding, explaining, and
modifying every submitted path.
