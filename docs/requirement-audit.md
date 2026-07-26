# Assignment Requirement Audit

Audited against `docs/assignment/spec.md` after the final core phase.

| Requirement                                                         | Evidence                                                   | Status    |
| ------------------------------------------------------------------- | ---------------------------------------------------------- | --------- |
| Operations board, summaries, filters, table, details sheet          | `OperationsPage`, required components                      | Complete  |
| At least 5,000 shipments and responsive list strategy               | deterministic repository; server-side page size 50         | Complete  |
| Search plus exception, priority, status, origin, assignment filters | URL codec, handlers, URL/component tests                   | Complete  |
| Refresh/share URL state                                             | router-owned canonical search parameters                   | Complete  |
| Structured server state, states, retry/cache/refetch                | query keys/client/hooks and component error states         | Complete  |
| Optimistic acknowledge and assign                                   | mutation hooks/cache overlay tests                         | Complete  |
| Approximately 20% mutation failure                                  | deterministic MSW scenario policy                          | Complete  |
| Rollback, clear error, consistent cache                             | snapshot restore plus later-event replay; integration test | Complete  |
| Periodic random realtime updates                                    | mock source and shared repository                          | Complete  |
| Existing, duplicate, stale, invisible event handling                | strict reconciler and focused tests                        | Complete  |
| Temporary loss/reconnect                                            | connection UX, faster polling, reconnect invalidation test | Complete  |
| Avoid table-wide rerender                                           | reference-preserving cache patches and memoized rows       | Complete  |
| Mutation/realtime conflict                                          | response/snapshot causal base plus ordered patch replay    | Complete  |
| Pending + newer event + success                                     | deterministic mutation reconciliation test                 | Complete  |
| Pending + newer event + failure                                     | deterministic mutation reconciliation test                 | Complete  |
| Details content and five recent events                              | details component/API tests                                | Complete  |
| VIEWER/OPERATOR behavior                                            | capability gates, backend 403, component tests             | Complete  |
| Required focused tests and failed-mutation flow                     | URL, permission, event, filtered rollback suites           | Complete  |
| React, TypeScript, Vite, router, formatting, tests, mock API        | package scripts and implementation                         | Complete  |
| ESLint                                                              | Oxlint is configured instead; documented deviation         | Deviation |
| README deliverables and ten questions                               | root `README.md`                                           | Complete  |
| AI-use disclosure                                                   | root `README.md`                                           | Complete  |

## Performance review

- The browser renders at most 50 rows, not 5,000.
- Filtering/sorting/summary computation occurs in the mock server repository.
- Realtime patches inspect only cached pages and create no invisible entities.
- Unchanged row objects retain identity; memoized row components therefore skip
  unrelated event updates.
- List invalidations are coalesced for 250 ms instead of refetching per event.
- Connection status is a narrow context consumer and does not replace table data.
- Remaining production concern: the single bundle is approximately 608 kB
  minified (about 184 kB gzip), above Vite's warning threshold.

## Final scope accounting

All required functional behavior is implemented. The only literal required-tool
deviation is Oxlint in place of ESLint. Optional Playwright, profiler automation,
deployment, and visual enhancements were not added.
