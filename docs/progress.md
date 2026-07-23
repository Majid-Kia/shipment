# Implementation Progress

## Foundation phase — completed 2026-07-23

The user requested “Phase 1: project foundation only.” In the approved implementation plan this scope is named **Phase 0 — Tooling and executable shell**; the requested scope, rather than the phase number, was treated as authoritative.

### Completed work

- Added the real application provider tree with a centralized TanStack Query client factory and production defaults.
- Added React Router route objects, a browser router, `/operations`, root/unknown-route redirects, and a minimal shared application shell.
- Added a presentation-only operations placeholder using the existing shadcn Card and Tailwind theme. No shipment domain, API, filter, table, mutation, or realtime behavior was implemented.
- Added development MSW browser-worker bootstrap and the generated service-worker asset.
- Added Node MSW server lifecycle for tests with strict unhandled-request behavior.
- Added Vitest/jsdom configuration, React Testing Library/jest-dom setup, a `matchMedia` test shim required by Sonner, and isolated QueryClient defaults for tests.
- Added shared `renderApp` and `renderWithProviders` test utilities.
- Added a smoke test that starts at `/`, follows the real redirect, and renders `/operations` through the actual route tree and providers.
- Enabled explicit TypeScript strict mode and retained the existing `@/*` alias in Vite, Vitest, and TypeScript.
- Added test/watch/typecheck scripts and completed Prettier/Oxlint configuration.
- Validated `npm run lint`, `npm run test`, and `npm run build`.

### Changed files

Foundation and configuration:

- `package.json`
- `.oxlintrc.json`
- `.prettierrc.json`
- `.prettierignore`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vitest.config.ts`
- `public/mockServiceWorker.js`
- `src/main.tsx`
- `src/App.tsx`
- `src/app/providers.tsx`
- `src/app/query-client.ts`
- `src/app/router.tsx`
- `src/app/shell.tsx`
- `src/app/App.test.tsx`
- `src/features/operations/OperationsPage.tsx`
- `src/mocks/browser.ts`
- `src/mocks/server.ts`
- `src/test/setup.ts`
- `src/test/render-app.tsx`
- `docs/progress.md`

Formatting-only normalization from the first repository-wide Prettier run:

- `docs/architecture/implementation-plan.md`
- `src/index.css`
- `src/lib/utils.ts`
- Existing files under `src/components/ui/`

### Deviations from the implementation plan

- Phase naming differs: the user called this Phase 1, while the approved plan calls the same foundation scope Phase 0.
- No basic error boundary was added because it is not part of the approved foundation plan and adding one now would be a speculative abstraction.
- The planned role, toaster, and realtime providers are not all present yet. The toaster is mounted because it is infrastructure-ready; role and realtime providers require later feature/protocol work and were intentionally not stubbed.
- MSW has no shipment handlers yet. Browser and Node boundaries are established with empty handlers for the next backend-contract phase.
- The repository-wide format command normalized existing scaffold files. Those changes are formatting-only and contain no product behavior.

### Validation

- `npm run lint` — passes with two pre-existing shadcn fast-refresh warnings for exported button/badge variant constants.
- `npm run test` — passes: 1 test file, 1 smoke test.
- `npm run build` — passes.

### Remaining risks

- The test process prints a non-failing Node/jsdom experimental warning about unavailable file-backed `localStorage`; no current application behavior relies on persistence.
- Browser MSW startup has been build-validated but has no business handler to exercise until the mock backend phase.
- Query retry behavior is currently the foundation default (`2`); the later typed error model must replace this with the approved retry predicate.
- The existing shadcn files produce two non-failing Oxlint fast-refresh warnings. They should be suppressed only with a narrow configuration or refactored if they become material; broad rule disabling is not justified.
- Shipment contracts, role provider, mock repository, query keys, and realtime reconciliation remain intentionally unimplemented.

## Mock backend and contracts phase — completed 2026-07-23

The user requested this work as Phase 2. It implements the approved contract/mock-backend scope only; board UI, query hooks, optimistic cache behavior, permissions UI, and realtime transport remain out of scope.

### Completed work

- Added TypeScript domain models for shipments, shipment details, operators, status history, recent events, summaries, mutation contracts, and structured API errors.
- Added strict Zod schemas for every HTTP request/response boundary used in this phase.
- Added a seeded deterministic factory that creates exactly 5,000 shipments and 20 operators.
- Added an in-memory repository with defensive copies, deterministic ordering, server-style filtering, pagination, filter-scoped summary aggregation, details, and mutation methods.
- Implemented the reviewed default-status rule: omitted status returns OPEN and ACKNOWLEDGED; explicit `status=RESOLVED` returns resolved records.
- Implemented case-insensitive search over shipment number, origin, and destination plus priority, exception type, origin, and assigned/unassigned filters.
- Added MSW endpoints:
  - `GET /api/shipments`
  - `GET /api/shipments/:id`
  - `GET /api/operators`
  - `POST /api/shipments/:id/acknowledge`
  - `POST /api/shipments/:id/assign`
- Enforced OPERATOR mutation authorization, expected-version conflicts, OPEN-only acknowledgement, and assignment only for OPEN/ACKNOWLEDGED shipments.
- Added a default 20% deterministic mutation-failure controller with explicit failure-rate and next-result controls for tests.
- Ensured configured mutation failures occur after request, permission, entity, version, and eligibility validation but before repository mutation.
- Added a fetch-based API client that supports abort signals, role headers, Zod response validation, and discriminated validation/network/HTTP/unknown errors.
- Added a normalized TanStack Query key factory for lists, details, and operators. Query hooks were intentionally not added.

### Changed files

- `src/domain/shipment.ts`
- `src/domain/operator.ts`
- `src/domain/contracts.ts`
- `src/domain/errors.ts`
- `src/domain/schemas.ts`
- `src/api/http-client.ts`
- `src/api/shipments-api.ts`
- `src/api/operators-api.ts`
- `src/mocks/factories.ts`
- `src/mocks/database.ts`
- `src/mocks/scenarios.ts`
- `src/mocks/handlers.ts`
- `src/mocks/browser.ts`
- `src/mocks/server.ts`
- `src/test/setup.ts`
- `src/features/operations/operations-query-keys.ts`
- `src/api/shipments-api.test.ts`
- `src/domain/schemas.test.ts`
- `src/features/operations/operations-query-keys.test.ts`
- `docs/progress.md`

### Focused test coverage

- Exact 5,000-record repository size and deterministic first record.
- Default active-status behavior and explicit resolved filtering.
- Search plus conjunctive priority/exception/origin/assignment filtering.
- Stable, bounded, non-overlapping pagination and deterministic ordering.
- Filter-scoped summary values before pagination.
- Shipment details, status history, exception information, and five-event cap.
- Deterministic 20-operator directory.
- Forced mutation failure with proof that authoritative state is unchanged.
- Successful acknowledge/assign mutation fields, history/events, and monotonic version increments.
- Stale expected-version conflict and resolved-assignment eligibility rejection.
- Malformed successful HTTP response mapped to a typed validation error.
- Direct schema rejection of invalid enums, timestamps, extra fields, and mutation bodies.
- Equivalent query parameter normalization and separate list/detail key namespaces.

### Deviations from the implementation plan

- The mock endpoints do not add artificial 150–400 ms latency yet. Latency was not part of the requested scope and would slow focused contract tests; it can be introduced as a configurable browser-only scenario when loading/optimistic states are implemented.
- Domain types and runtime schemas are maintained as explicit paired definitions rather than deriving every public TypeScript type from Zod. This keeps domain imports independent of runtime validation while schema tests guard the boundary.
- The generated history/event fixtures are intentionally compact but valid: each shipment has lifecycle history and exactly five recent events rather than a large event archive.
- The API client uses the browser origin to resolve `/api` paths; SSR support is intentionally out of scope.

### Validation

- `npm run lint` — passes with the same two pre-existing shadcn fast-refresh warnings.
- `npm run test` — passes: 4 test files, 16 tests.
- `npm run build` — passes.

### Remaining risks

- The mock repository performs linear filtering and a sort for each list request. This is appropriate for 5,000 records; the documented 100,000-record production design requires backend indexes/search.
- Runtime schema and handwritten contract types could drift if later changes are made to only one side; focused schema/API tests must remain mandatory.
- Mutation failure randomness is deterministic in the mock process and defaults to 20%, but statistical distribution is not asserted to avoid a brittle probabilistic test.
- Repository reset regenerates 5,000 records after each test. Current suite time is acceptable, but fixture reset strategy may need optimization as the suite grows.
- Realtime commits do not exist yet; the repository is ready to be shared by that later transport.
- TanStack Query policies and hooks, URL state, list/detail cache relationships, optimistic updates, and UI states remain intentionally unimplemented.
