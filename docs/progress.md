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
