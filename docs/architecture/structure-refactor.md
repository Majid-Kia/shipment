# Hybrid Feature-Oriented Structure Refactor

This document records the ownership decisions for the structural migration from
the original feature-oriented layout to explicit shared, entity, feature,
realtime, auth, and mock boundaries.

## Final source tree

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   ├── query-client.ts
│   ├── router.tsx
│   ├── shell.tsx
│   └── styles.css
├── shared/
│   ├── api/{errors.ts,http-client.ts}
│   ├── lib/utils.ts
│   └── ui/{alert,badge,button,card,input,sheet,skeleton,table}.tsx
├── entities/
│   ├── operator/
│   │   ├── model/operator.ts
│   │   └── api/{operator-contracts.ts,operators-api.ts}
│   └── shipment/
│       ├── model/shipment.ts
│       └── api/{shipment-contracts.ts,shipments-api.ts}
├── features/
│   └── operations/
│       ├── api/{operations-api.ts,operations-contracts.ts}
│       ├── model/
│       │   ├── mutation-reconciliation.ts
│       │   ├── operations-cache.ts
│       │   ├── operations-mutations.ts
│       │   ├── operations-queries.ts
│       │   ├── operations-query-keys.ts
│       │   ├── operations-realtime-cache.ts
│       │   └── operations-search-params.ts
│       └── ui/
│           ├── OperationsBoard.tsx
│           ├── OperationsPage.tsx
│           ├── Pagination.tsx
│           ├── ShipmentDetailsActions.tsx
│           ├── ShipmentDetailsContent.tsx
│           ├── ShipmentDetailsSheet.tsx
│           ├── ShipmentFilters.tsx
│           ├── ShipmentTable.tsx
│           └── SummaryCards.tsx
├── auth/{permissions.ts,role-context.tsx}
├── realtime/
│   ├── contracts.ts
│   ├── realtime-provider.tsx
│   ├── reconcile-shipment-event.ts
│   ├── reconciliation-registry.ts
│   ├── shipment-cache.ts
│   └── shipment-reconciliation.ts
├── mocks/
│   ├── browser.ts
│   ├── database.ts
│   ├── factories.ts
│   ├── handlers.ts
│   ├── realtime-source.ts
│   ├── scenarios.ts
│   └── server.ts
├── test/{render-app.tsx,setup.ts}
└── main.tsx
```

Tests remain colocated beside their owned modules and are omitted from this
compact tree only to keep it readable; every test path is listed in the test
migration table below.

## Production file classification

| Original path                                                                   | Target path                                                                             | Change         | Ownership reason                                                                                           |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                                                   | `src/app/App.tsx`                                                                       | Move           | Root application composition belongs with providers and router.                                            |
| `src/main.tsx`                                                                  | `src/main.tsx`                                                                          | Unchanged      | Vite entry point is the startup boundary.                                                                  |
| `src/index.css`                                                                 | `src/app/styles.css`                                                                    | Move           | Global application styling is loaded by startup, not a shared component primitive.                         |
| `src/app/providers.tsx`                                                         | `src/app/providers.tsx`                                                                 | Update         | Application provider composition remains in `app`.                                                         |
| `src/app/query-client.ts`                                                       | `src/app/query-client.ts`                                                               | Unchanged      | QueryClient defaults are application configuration.                                                        |
| `src/app/router.tsx`                                                            | `src/app/router.tsx`                                                                    | Update         | Route composition remains in `app`; only the page import changes.                                          |
| `src/app/shell.tsx`                                                             | `src/app/shell.tsx`                                                                     | Unchanged      | The global shell is application composition.                                                               |
| `src/api/errors.ts`                                                             | `src/shared/api/errors.ts`                                                              | Move/expand    | Generic normalized API errors and the error-envelope schema are transport primitives.                      |
| `src/api/http-client.ts`                                                        | `src/shared/api/http-client.ts`                                                         | Move           | Fetch, JSON parsing, abort support, validation, headers, and normalization are generic transport behavior. |
| `src/api/shipment-contracts.ts`                                                 | Multiple destinations below                                                             | Split          | The file mixes generic errors, Shipment commands, Operator responses, and Operations list contracts.       |
| `src/api/shipments-api.ts`                                                      | Multiple destinations below                                                             | Split          | The file mixes three endpoint ownership areas.                                                             |
| `src/components/ui/alert.tsx`                                                   | `src/shared/ui/alert.tsx`                                                               | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/badge.tsx`                                                   | `src/shared/ui/badge.tsx`                                                               | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/button.tsx`                                                  | `src/shared/ui/button.tsx`                                                              | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/card.tsx`                                                    | `src/shared/ui/card.tsx`                                                                | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/input.tsx`                                                   | `src/shared/ui/input.tsx`                                                               | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/sheet.tsx`                                                   | `src/shared/ui/sheet.tsx`                                                               | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/skeleton.tsx`                                                | `src/shared/ui/skeleton.tsx`                                                            | Move           | Generic presentation primitive.                                                                            |
| `src/components/ui/table.tsx`                                                   | `src/shared/ui/table.tsx`                                                               | Move           | Generic presentation primitive.                                                                            |
| `src/lib/utils.ts`                                                              | `src/shared/lib/utils.ts`                                                               | Move           | `cn` is a framework-level styling helper.                                                                  |
| `src/domain/shipment.ts`                                                        | `src/entities/shipment/model/shipment.ts` and `src/entities/operator/model/operator.ts` | Split          | Shipment aggregate data belongs to Shipment; Operator identity is independently reusable.                  |
| `src/features/operations/OperationsPage.tsx`                                    | `src/features/operations/ui/OperationsPage.tsx`                                         | Move           | Page orchestration is Operations UI.                                                                       |
| `src/features/operations/components/OperationsBoard.tsx`                        | `src/features/operations/ui/OperationsBoard.tsx`                                        | Move/split     | Board state presentation belongs to Operations UI; pagination becomes its own UI module.                   |
| Pagination embedded in `src/features/operations/components/OperationsBoard.tsx` | `src/features/operations/ui/Pagination.tsx`                                             | Split          | Pagination is extracted from `OperationsBoard` without behavior changes.                                   |
| `src/features/operations/components/ShipmentDetailsActions.tsx`                 | `src/features/operations/ui/ShipmentDetailsActions.tsx`                                 | Move           | Permission-aware workflow actions are Operations UI.                                                       |
| `src/features/operations/components/ShipmentDetailsContent.tsx`                 | `src/features/operations/ui/ShipmentDetailsContent.tsx`                                 | Move           | Operations detail presentation.                                                                            |
| `src/features/operations/components/ShipmentDetailsSheet.tsx`                   | `src/features/operations/ui/ShipmentDetailsSheet.tsx`                                   | Move           | Operations detail orchestration.                                                                           |
| `src/features/operations/components/ShipmentFilters.tsx`                        | `src/features/operations/ui/ShipmentFilters.tsx`                                        | Move           | Operations filter presentation.                                                                            |
| `src/features/operations/components/ShipmentTable.tsx`                          | `src/features/operations/ui/ShipmentTable.tsx`                                          | Move           | Operations result presentation.                                                                            |
| `src/features/operations/components/SummaryCards.tsx`                           | `src/features/operations/ui/SummaryCards.tsx`                                           | Move           | Board-specific summary presentation.                                                                       |
| `src/features/operations/operations-query-keys.ts`                              | `src/features/operations/model/operations-query-keys.ts`                                | Move           | Structured board query identity is feature state.                                                          |
| `src/features/operations/operations-queries.ts`                                 | `src/features/operations/model/operations-queries.ts`                                   | Move           | React Query orchestration is feature behavior.                                                             |
| `src/features/operations/operations-mutations.ts`                               | `src/features/operations/model/operations-mutations.ts`                                 | Move           | Optimistic workflow commands are feature behavior.                                                         |
| `src/features/operations/operations-cache.ts`                                   | `src/features/operations/model/operations-cache.ts`                                     | Move           | Board list/detail cache coordination is feature behavior.                                                  |
| `src/features/operations/mutation-reconciliation.ts`                            | `src/features/operations/model/mutation-reconciliation.ts`                              | Move           | Mutation settlement coordinates feature caches with realtime metadata.                                     |
| `src/features/operations/operations-search-params.ts`                           | `src/features/operations/model/operations-search-params.ts`                             | Move           | Shareable board URL state is feature behavior.                                                             |
| `src/realtime/contracts.ts`                                                     | `src/realtime/contracts.ts`                                                             | Unchanged      | Production-facing transport contract and event schema.                                                     |
| `src/realtime/reconciliation-registry.ts`                                       | `src/realtime/reconciliation-registry.ts`                                               | Unchanged      | Transport-independent high-water marks, event IDs, and pending metadata.                                   |
| `src/realtime/reconcile-shipment-event.ts`                                      | `src/realtime/reconcile-shipment-event.ts`                                              | Update         | Reconciliation algorithm remains here but consumes a cache port instead of Operations keys.                |
| `src/realtime/shipment-reconciliation.ts`                                       | `src/realtime/shipment-reconciliation.ts`                                               | Narrow         | Entity-level event merging remains realtime-owned; Operations cache access moves to the feature adapter.   |
| `src/realtime/realtime-provider.tsx`                                            | `src/realtime/realtime-provider.tsx`                                                    | Update         | Connection lifecycle remains realtime-owned and consumes an injected cache port.                           |
| `src/realtime/shipment-cache.ts`                                                | `src/realtime/shipment-cache.ts`                                                        | Create         | Defines the narrow cache capabilities required by realtime without importing Operations.                   |
| `src/features/operations/model/operations-realtime-cache.ts`                    | Same                                                                                    | Create         | Implements the realtime cache port using unchanged Operations query keys and cache patch semantics.        |
| `src/auth/permissions.ts`                                                       | `src/auth/permissions.ts`                                                               | Unchanged      | Role and capability contracts remain isolated.                                                             |
| `src/auth/role-context.tsx`                                                     | `src/auth/role-context.tsx`                                                             | Unchanged      | Mocked role UI state remains in the auth boundary.                                                         |
| `src/mocks/browser.ts`                                                          | `src/mocks/browser.ts`                                                                  | Unchanged      | Browser MSW adapter.                                                                                       |
| `src/mocks/server.ts`                                                           | `src/mocks/server.ts`                                                                   | Unchanged      | Test MSW adapter.                                                                                          |
| `src/mocks/database.ts`                                                         | `src/mocks/database.ts`                                                                 | Update imports | Mock backend repository remains infrastructure.                                                            |
| `src/mocks/factories.ts`                                                        | `src/mocks/factories.ts`                                                                | Update imports | Deterministic mock entity generation remains infrastructure.                                               |
| `src/mocks/handlers.ts`                                                         | `src/mocks/handlers.ts`                                                                 | Update imports | Mock HTTP adapter implements entity and Operations contracts.                                              |
| `src/mocks/scenarios.ts`                                                        | `src/mocks/scenarios.ts`                                                                | Unchanged      | Deterministic mock failure controls remain infrastructure.                                                 |
| `src/mocks/realtime-source.ts`                                                  | `src/mocks/realtime-source.ts`                                                          | Unchanged      | Timer-based implementation remains in mocks; `ShipmentEventSource` stays in realtime.                      |
| `src/test/render-app.tsx`                                                       | `src/test/render-app.tsx`                                                               | Update         | Cross-feature test composition stays in the test boundary.                                                 |
| `src/test/setup.ts`                                                             | `src/test/setup.ts`                                                                     | Unchanged      | Global test infrastructure remains in the test boundary.                                                   |

## Split API and contract exports

| Existing export                                                             | Destination                                       | Reason                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `request`                                                                   | `shared/api/http-client.ts`                       | Generic validated HTTP transport.                                                               |
| `AppError`, `ApiClientError`                                                | `shared/api/errors.ts`                            | Generic normalized application errors.                                                          |
| `apiErrorBodySchema`, `errorCodeSchema`, `ApiErrorBody`, `ErrorCode`        | `shared/api/errors.ts`                            | Generic HTTP error envelope.                                                                    |
| `shipmentSchema`, `shipmentDetailsSchema`, Shipment constants/types/helpers | `entities/shipment/model/shipment.ts`             | Shipment aggregate model.                                                                       |
| `operatorSchema`, `Operator`                                                | `entities/operator/model/operator.ts`             | Operator entity model.                                                                          |
| `getShipment`                                                               | `entities/shipment/api/shipments-api.ts`          | Reusable entity read.                                                                           |
| `acknowledgeShipment`, `assignShipment`                                     | `entities/shipment/api/shipments-api.ts`          | Reusable commands on a versioned Shipment aggregate, independent of board filters or summaries. |
| Mutation request/response schemas and types                                 | `entities/shipment/api/shipment-contracts.ts`     | Contracts for reusable Shipment commands.                                                       |
| `getOperators`                                                              | `entities/operator/api/operators-api.ts`          | Reusable Operator directory read.                                                               |
| `operatorsResponseSchema`, `OperatorsResponse`                              | `entities/operator/api/operator-contracts.ts`     | Operator endpoint contract.                                                                     |
| `getShipments` and list parameter serialization                             | `features/operations/api/operations-api.ts`       | Board-specific filtering, default status semantics, pagination, and summary response.           |
| `ShipmentListParams`, summary/list schemas and types                        | `features/operations/api/operations-contracts.ts` | Operations Board query contract rather than a pure Shipment entity contract.                    |

## Circular dependency risk

Before migration, `features/operations` imported the realtime registry while
`realtime` imported Operations query keys and list contracts. This formed a
feature/realtime cycle and made the production realtime boundary aware of one
screen's cache layout.

The refactor introduces a small realtime-owned `ShipmentRealtimeCache` port.
Operations implements that port with its existing keys and reference-preserving
patch logic. Application provider composition injects the implementation into
the realtime provider. The event ordering, version comparison, optimistic
overlay, mutation replay, invalidation timing, and query-key values remain
unchanged.

## Dependency direction

The intended production direction is:

```text
app -> features -> entities -> shared
app -> auth
app -> realtime -> entities
features -> auth
features -> realtime contracts/registry
mocks -> feature/entity API contracts, auth, shared, realtime
```

`shared` has no upward imports. Entities do not import features or app.
Realtime does not import Operations modules. No feature, entity, shared, auth,
or realtime module imports a mock implementation.

## Test file migration

| Original path                                               | Target path                                                     | Change                              |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| `src/app/App.test.tsx`                                      | `src/app/App.test.tsx`                                          | Unchanged                           |
| `src/app/query-client.test.ts`                              | `src/app/query-client.test.ts`                                  | Updated shared API import           |
| `src/api/shipment-contracts.test.ts`                        | `src/entities/shipment/api/shipment-contracts.test.ts`          | Move                                |
| `src/api/shipments-api.test.ts`                             | `src/entities/shipment/api/shipments-api.test.ts`               | Split: Shipment read/command cases  |
| `src/api/shipments-api.test.ts`                             | `src/entities/operator/api/operators-api.test.ts`               | Split: Operator directory case      |
| `src/api/shipments-api.test.ts`                             | `src/features/operations/api/operations-api.test.ts`            | Split: board list/filter/page cases |
| `src/domain/shipment.test.ts`                               | `src/entities/shipment/model/shipment.test.ts`                  | Move                                |
| `src/features/operations/OperationsPage.test.tsx`           | `src/features/operations/ui/OperationsPage.test.tsx`            | Move                                |
| `src/features/operations/ShipmentMutations.test.tsx`        | `src/features/operations/ui/ShipmentMutations.test.tsx`         | Move                                |
| `src/features/operations/ShipmentPermissions.test.tsx`      | `src/features/operations/ui/ShipmentPermissions.test.tsx`       | Move                                |
| `src/features/operations/components/ShipmentTable.test.tsx` | `src/features/operations/ui/ShipmentTable.test.tsx`             | Move                                |
| `src/features/operations/mutation-reconciliation.test.ts`   | `src/features/operations/model/mutation-reconciliation.test.ts` | Move                                |
| `src/features/operations/operations-query-keys.test.ts`     | `src/features/operations/model/operations-query-keys.test.ts`   | Move                                |
| `src/mocks/realtime-source.test.ts`                         | `src/mocks/realtime-source.test.ts`                             | Unchanged                           |
| `src/realtime/realtime-provider.test.tsx`                   | `src/realtime/realtime-provider.test.tsx`                       | Updated for injected cache port     |
| `src/realtime/reconcile-shipment-event.test.ts`             | `src/realtime/reconcile-shipment-event.test.ts`                 | Updated for injected cache port     |

The existing 43 test cases were preserved. The combined API test file was
partitioned without adding, weakening, or deleting assertions.

## Change accounting

- **Moved:** application root/style files, generic UI and helper modules,
  generic transport modules, Shipment model, Operations UI/model modules, and
  their colocated tests.
- **Split:** the Shipment/Operator model, combined API contracts, combined API
  gateway, combined API test suite, and the pagination component embedded in
  `OperationsBoard`.
- **Created:** Operator model/API modules, Shipment command contracts,
  Operations list API modules, realtime cache port, Operations cache adapter,
  standalone pagination, and this migration record.
- **Merged:** none.
- **Deleted as obsolete locations:** `src/api`, `src/domain`,
  `src/components/ui`, `src/lib`, and the old flat Operations/component paths.
  Their behavior now exists at the mapped destinations above.

## Intentionally unchanged boundaries and retained compromises

- `auth` remains unchanged because capability ownership and mocked role state
  were already isolated; moving either into Operations would weaken the
  production-authorization distinction.
- Mock repository, handlers, scenarios, factories, and realtime source remain
  in `mocks`. Only their imports changed to the newly owned contracts.
- Realtime contracts, registry data structures, version rules, event-ID
  retention, merge rules, and timing behavior remain unchanged. Only cache
  access was inverted behind a port to remove the layer cycle.
- Query-key values, endpoint URLs, schemas, headers, payloads, and default
  QueryClient behavior remain unchanged.
- `src/main.tsx` is the composition root that selects the mock realtime adapter
  and development MSW worker because this take-home intentionally has no
  production transport implementation. No app, feature, entity, shared, auth,
  or realtime module imports a mock implementation.
- The mock HTTP adapter imports the Operations list contract because it
  implements that feature-owned API port. Mocks are outside the production
  dependency graph.
- No repository-wide barrels or custom architecture lint plugin were added.
  Boundary direction is kept explicit through direct imports and verified by
  source searches.
