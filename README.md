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
URL filters -> Operations query hooks -> entity/workflow API gateways
              -> TanStack Query       -> shared validated HTTP client
                                      -> MSW repository
MSW repository -> mock event source -> realtime reconciler
                                      -> Operations cache adapter -> query cache
local selection/role/connection state ------------------------------> React UI
```

```text
src/
  app/                  composition, router, QueryClient, shell, styles
  shared/               HTTP/error primitives, reusable UI, generic helpers
  entities/
    shipment/           Shipment model, schemas, reads, aggregate commands
    operator/           Operator model and directory endpoint
  features/operations/
    api/                 board list contract and endpoint
    model/               URL/query/mutation/cache orchestration
    ui/                  page, board, details, filters, table, pagination
  auth/                 role context and capability rules
  realtime/             transport contracts, registry, reconciliation ports
  mocks/                MSW, repository, scenarios, realtime simulator
  test/                 shared test setup and rendering helpers
```

- `src/shared` contains only reusable technical primitives and has no imports
  from entities, features, realtime, mocks, or app.
- `src/entities` owns reusable Shipment and Operator models plus entity-level
  API gateways.
- `src/features/operations` owns board-specific list contracts, URL state,
  query keys/hooks, optimistic mutations, cache coordination, and UI.
- `src/mocks` owns the deterministic 5,000-record repository, MSW handlers,
  scenarios, and timer-based realtime implementation.
- `src/realtime` owns transport, connection state, event validation,
  deduplication, version ordering, and the cache port consumed through
  application composition.
- `src/auth` owns the mocked role and capability model.

TanStack Query owns server state. URL search parameters own shareable filters
and pagination. Component state owns ephemeral details selection and form
values. React contexts own the mocked role and connection status. The
non-rendering reconciliation registry owns event high-water marks, the bounded
event-ID LRU, and in-flight mutation metadata. The Operations feature implements
the realtime cache port with its existing structured query keys, avoiding a
realtime-to-feature dependency.

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

Server state—shipments, shipment details, operators, summaries, loading status, errors, and mutation results—is managed by TanStack Query. It owns fetching, caching, invalidation, polling, retries, optimistic updates, and rollback. Components consume the Query Cache directly; I do not copy query results into local useState, because that would create two sources of truth and introduce synchronization problems.

Shareable navigation state, such as filters and pagination, is stored in the URL through React Router. This allows refresh, deep linking, browser history, and sharing the current board view.

Local UI state is limited to transient concerns that do not belong to the server or URL. For example, the currently selected shipment ID is local state because it controls whether the details drawer is open. The search input also has a local draft value so typing can update immediately and be debounced before committing the value to the URL.

Small application-wide client states, such as the mock user role and realtime connection status, are managed through focused React contexts.

For mutation and realtime coordination, I use a non-rendering registry rather than component state. It tracks pending mutations, optimistic overlays, processed event IDs, and confirmed versions without causing unnecessary React renders.

the ownership model is:

TanStack Query
→ remote server state

React Router URL
→ filters and pagination

Local React state
→ selected shipment and temporary input state

React Context
→ role and realtime connection status

Reconciliation registry
→ non-visual concurrency metadata

### Why this folder and module structure?

I chose a pragmatic, feature-oriented modular structure rather than a purely layer-based structure. The main goal was to keep files close to the business capability that owns them while still separating reusable domain and infrastructure concerns.

The app layer contains only application composition, such as providers, routing, and Query Client configuration. Generic technical building blocks, including the HTTP client, error handling, UI primitives, and utilities, live under shared. Reusable business concepts such as Shipment and Operator, along with their entity-level APIs, are placed under entities.

The Operations Board is organized as a vertical feature slice. Its API contracts, query orchestration, URL state, optimistic mutations, cache coordination, and UI are colocated under features/operations. This makes it easier to understand and modify the complete Operations workflow without navigating through generic folders such as hooks, services, types, and components.

I also separated realtime, auth, and mocks because they represent distinct boundaries. The realtime layer owns event transport and reconciliation, the auth layer owns roles and permissions, and the mocks layer simulates the backend without leaking mock-specific implementations into production modules.

The dependency direction is intentional: features can depend on entities and shared modules, but entities and shared modules must not depend on features. This reduces coupling and helps prevent circular dependencies.

I also placed APIs according to ownership rather than putting every endpoint in one global API folder. For example, the Operations Board list endpoint lives in the Operations feature because its filtering, summary, and pagination semantics belong to that workflow. A reusable endpoint such as fetching a Shipment by ID belongs to the Shipment entity, while the generic HTTP mechanism remains in shared/api.

This is not a strict implementation of Feature-Sliced Design or Clean Architecture. It is a pragmatic version suitable for the project’s scope and timebox. It keeps the current code discoverable while providing a clear path for adding more entities and features without turning shared folders into dumping grounds.

### How are realtime events reconciled with the query cache?

Incoming events are validated, merged with the latest confirmed shipment state, and applied to both list and detail cache entries. Related queries are then invalidated when totals, ordering, or filter membership may have changed, allowing HTTP refetches to restore full consistency.

### How are duplicate and out-of-order events handled?

Each event has a unique eventId and a shipment version. Previously processed IDs are ignored as duplicates, while events whose version is not newer than the confirmed shipment version are rejected as stale or out of order.

### How does optimistic rollback work?

Before a mutation, the affected cache entries are snapshotted and an optimistic overlay is applied. If the request fails, the overlay is removed, the snapshots are restored, and any newer real-time events received during the request are replayed so valid concurrent updates are not lost.

### How are mutation/realtime conflicts resolved?

Mutations use expectedVersion for optimistic concurrency control. While a mutation is pending, real-time events update the confirmed base state and the optimistic overlay remains visible. On success or failure, the client combines the authoritative response or restored snapshot with any newer accepted events.

### What changes for 100,000 shipments?

The UI would continue using server-side pagination rather than loading all records. The backend would require indexed filtering and sorting, potentially cursor-based pagination, efficient aggregate queries, and durable event sequencing. Virtualization would only be necessary if significantly more rows were rendered on one page.

### How would production authentication and authorization be introduced?

The mock role header would be replaced with an authenticated session or access token, typically using OIDC or OAuth. The backend would derive the user’s identity and permissions from trusted claims and enforce authorization on every operation. Client-side permission checks would remain only as a UX enhancement.

### Which timebox trade-offs were accepted?

Page-number pagination was chosen over infinite scrolling/virtualization;
filtered aggregate convergence uses debounced refetch rather than maintaining
every cached result perfectly; the mock repository scans 5,000 records; only
one mutation per shipment is allowed; there is no offline mutation queue,
production backend, or full E2E suite. Drawer status lost in refresh.

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
