**Front-End Technical Assignment**

**Real-Time Shipment Exception Board**

**Objective**

Build a focused, production-oriented front-end application using **React and TypeScript**.

The application should allow operations users to monitor and manage shipment exceptions in near real time. The scope is intentionally limited, but the implementation should demonstrate senior-level capabilities in:

- Front-end architecture
- React and TypeScript
- Server-state management
- Real-time data handling
- Performance optimization
- Error handling
- Testing
- Engineering trade-offs

**Expected Effort**

The expected effort is approximately **15-20 hours**.

Please do not spend significantly more time than this. If you cannot complete every requirement within the timebox, document:

- What you completed
- What remains incomplete
- The trade-offs you made
- What you would improve with more time

**Business Scenario**

An operations user needs to monitor shipments that currently have operational exceptions.

Each shipment may have one of the following exception types:

- `DELAYED`
- `CUSTOMS_HOLD`
- `DOCUMENT_MISSING`
- `CONTAINER_NOT_ASSIGNED`
- `PORT_CONGESTION`

The user should be able to:

- View shipment exceptions
- Search and filter shipments
- View shipment details
- Acknowledge an exception
- Assign a shipment to an operator
- Receive simulated real-time shipment updates
- Continue using the application when individual requests or real-time updates fail

**Required Features**

**1. Operations Board**

Create a single-page operations dashboard containing:

- Summary cards
- Filter controls
- Shipment table
- Shipment details drawer or side panel

Suggested summary cards:

- Total Exceptions
- Critical Exceptions
- Unassigned Shipments
- Acknowledged Exceptions

The shipment table should include at least the following columns:

| **Column**      | **Description**                |
| --------------- | ------------------------------ |
| Shipment Number | Unique shipment reference      |
| Origin          | Origin port                    |
| Destination     | Destination port               |
| ETA             | Estimated arrival time         |
| Exception       | Current exception type         |
| Priority        | Low, Medium, High or Critical  |
| Status          | Open, Acknowledged or Resolved |
| Assigned To     | Assigned operator              |
| Last Updated    | Last modification time         |

**2. Data Volume and Performance**

The mock data source must contain at least **5,000 shipments**.

The application should remain responsive and should not visibly freeze when:

- Rendering the shipment list
- Applying filters
- Receiving real-time updates
- Opening shipment details
- Updating a shipment

Choose and implement an appropriate strategy, such as:

- Server-side pagination
- Virtualization
- Infinite scrolling
- A combination of pagination and virtualization

Document why you selected your approach.

Using React.memo, useMemo or useCallback everywhere without identifying an actual performance problem will not be considered a valid optimization strategy.

**3. Search, Filtering and URL State**

Implement the following filters:

- Text search
- Exception type
- Priority
- Status
- Origin port
- Assigned or unassigned

The active filters must be synchronized with the URL.

Example:

```text
/operations?status=OPEN&priority=CRITICAL&origin=IRBND&page=2
```

Refreshing or sharing the URL should preserve the current filter state.

**4. Server-State Management**

Use an appropriate server-state management approach. **TanStack Query is recommended**, but another well-justified solution is acceptable.

The implementation should include:

- Structured query keys
- Loading states
- Empty states
- Error states
- A reasonable retry policy
- Cache configuration
- Mutation handling
- Background refetching where appropriate

Server state should be clearly separated from local UI state.

**5. Optimistic Updates**

Implement the following actions:

**Acknowledge Exception**

`OPEN` → `ACKNOWLEDGED`

**Assign Operator**

Allow the user to assign a shipment to an available operator.

Both actions should use optimistic updates.

The mock API must fail approximately **20% of mutation requests**.

When a mutation fails:

- The optimistic update must be rolled back
- The user must receive a clear error message
- The cache must remain consistent
- The UI must not remain in a false success state

**6. Real-Time Updates**

Implement a mock WebSocket, event stream or equivalent simulation.

The stream should periodically update random shipments.

Example event:

```json
{
  "eventId": "evt-18272",
  "shipmentId": "SHP-100248",
  "version": 17,
  "type": "SHIPMENT_UPDATED",
  "timestamp": "2026-07-21T10:30:00Z",
  "payload": {
    "priority": "CRITICAL",
    "exceptionType": "PORT_CONGESTION",
    "status": "OPEN"
  }
}
```

The application should handle:

- Updates to existing shipments
- Duplicate events
- Out-of-order events
- Events for shipments that are not currently visible
- Temporary connection loss
- Reconnection
- Avoiding unnecessary re-rendering of the entire table

The version field may be used to reject stale events.

For example, if the current entity version is 17, an incoming event with version 16 should not overwrite it.

**7. Mutation and Real-Time Conflict**

Consider the following scenario:

- The user acknowledges a shipment.
- Before the mutation response is received, a real-time event arrives for the same shipment.
- The event contains a different shipment status or version.

Design and implement a defensible conflict-resolution strategy.

Possible approaches include:

- Server version as the source of truth
- Version-based reconciliation
- Last-write-wins
- Cache invalidation and refetch
- Explicit merge rules

There is no single mandatory solution. The important requirement is that the selected behavior is intentional, consistent and documented.

**8. Shipment Details**

Selecting a table row should open a drawer or side panel containing:

- Shipment information
- Exception details
- Current assignment
- Status history
- The five most recent events

Shipment details may be loaded through a separate query.

**9. Role-Based User Interface**

Real authentication is not required.

Use two mocked roles:

- `VIEWER`
- `OPERATOR`

**Viewer**

Can:

- View shipments
- Search and filter
- View shipment details

Cannot:

- Acknowledge an exception
- Assign a shipment

**Operator**

Can:

- View shipments
- View details
- Acknowledge exceptions
- Assign shipments

The implementation should make it clear that hiding or disabling UI actions is only a user-experience measure. Real authorization must also be enforced by the backend in a production system.

**Testing Requirements**

Use an appropriate testing stack, such as:

- Vitest or Jest
- React Testing Library
- MSW

Implement at least three focused unit or component tests covering:

- Filter synchronization with the URL
- Permission-based rendering of actions
- Rejection of duplicate or out-of-order events

Also implement at least one integration-style test for the following flow:

```text
Load shipments
→ Apply a filter
→ Open shipment details
→ Acknowledge the exception
→ Simulate API failure
→ Verify optimistic rollback
```

A complete E2E suite is not required.

Playwright may be used as an optional enhancement.

**Technical Requirements**

**Required**

- React
- TypeScript
- Vite
- A routing solution such as React Router
- ESLint
- Code formatting
- Automated tests
- Mock API or in-memory data source
- README documentation

**Allowed**

You may use libraries such as:

- TanStack Query
- TanStack Table
- Zustand
- Redux Toolkit
- React Window
- MUI
- Ant Design
- Tailwind CSS
- Shadcn
- MSW
- Zod

You are not expected to use all of them. A smaller set of well-justified dependencies is preferable to unnecessary tooling.

**Suggested Data Model**

```typescript
type ShipmentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

type ShipmentPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type ExceptionType =
  | "DELAYED"
  | "CUSTOMS_HOLD"
  | "DOCUMENT_MISSING"
  | "CONTAINER_NOT_ASSIGNED"
  | "PORT_CONGESTION";

interface Operator {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  shipmentNumber: string;
  originPort: string;
  destinationPort: string;
  eta: string;
  exceptionType: ExceptionType;
  priority: ShipmentPriority;
  status: ShipmentStatus;
  assignedTo: Operator | null;
  version: number;
  updatedAt: string;
}
```

**Suggested API Contract**

**Get Shipments**

`GET /api/shipments`

Supported parameters:

- `page`
- `pageSize`
- `search`
- `status`
- `priority`
- `exceptionType`
- `originPort`
- `assigned`

Example response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 50,
  "total": 5000
}
```

**Get Shipment Details**

`GET /api/shipments/:id`

**Acknowledge Shipment**

`POST /api/shipments/:id/acknowledge`

**Assign Shipment**

`POST /api/shipments/:id/assign`

Example request body:

```json
{
  "operatorId": "OP-12"
}
```

You may adapt this API contract if your alternative is clearly documented.

**Out of Scope**

The following are intentionally excluded:

- Real backend implementation
- Database
- Real Keycloak integration
- Real login flow
- Microfrontend implementation
- Module Federation
- Next.js
- Kubernetes
- Production infrastructure
- Pixel-perfect design
- Full mobile responsiveness
- Full E2E test suite
- Internationalization
- Production deployment

The purpose of the assignment is not to build a complete product. It is to demonstrate depth within a focused vertical slice.

**Deliverables**

Please provide:

- Source-code repository
- Setup and run instructions
- Test instructions
- Architecture overview
- Known limitations
- Approximate time spent
- A list of incomplete items
- A brief explanation of major trade-offs

The application should run using a small number of documented commands, for example:

```bash
npm install
npm run dev
npm test
```

**README Questions**

Please answer the following questions in the README:

- How did you separate server state from local UI state?
- Why did you choose the current folder and module structure?
- How are real-time events reconciled with the query cache?
- How are duplicate and out-of-order events handled?
- How does optimistic rollback work?
- How do you resolve conflicts between mutations and real-time events?
- What would change if the system contained 100,000 shipments?
- How would authentication and authorization be introduced in production?
- Which trade-offs did you accept because of the timebox?
- What would you improve if you had one additional working day?

**Evaluation Criteria**

| **Area**                                | **Weight** |
| --------------------------------------- | ---------- |
| Architecture and separation of concerns | 20         |
| React and TypeScript proficiency        | 15         |
| Server-state and cache management       | 15         |
| Real-time event and conflict handling   | 15         |
| Performance                             | 10         |
| Testing                                 | 10         |
| Error handling and resilience           | 5          |
| Code quality                            | 5          |
| Documentation and trade-off analysis    | 5          |
| **Total**                               | **100**    |

**Important Note**

The use of AI-assisted development tools is allowed.

However, the candidate must:

- Understand and be able to explain all submitted code
- Review generated code before submission
- Include meaningful tests
- Be prepared to modify the implementation during the technical review
- Briefly document how AI tools were used, where applicable

The assessment will focus on engineering judgment, ownership and the ability to defend architectural decisions-not only on whether the application works.
