import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ShipmentListResponse } from "@/features/operations/api/operations-contracts";
import type { ShipmentDetails } from "@/entities/shipment/model/shipment";
import { operationsKeys } from "@/features/operations/model/operations-query-keys";
import { shipmentRepository } from "@/mocks/database";
import {
  forceNextMutationResult,
  setMutationDelay,
  setMutationFailureRate,
  waitForNextMutationPreflight,
} from "@/mocks/scenarios";
import type {
  RealtimeConnectionState,
  ShipmentEventSource,
} from "@/realtime/contracts";
import { getReconciliationRegistry } from "@/realtime/reconciliation-registry";
import { renderApp } from "@/test/render-app";

class ManualShipmentEventSource implements ShipmentEventSource {
  private eventListeners = new Set<(event: unknown) => void>();
  private connectionListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private state: RealtimeConnectionState = "disconnected";

  connect() {
    this.setConnectionState("connected");
  }

  disconnect() {
    this.setConnectionState("disconnected");
  }

  subscribe(listener: (event: unknown) => void) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  subscribeToConnection(listener: (state: RealtimeConnectionState) => void) {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  getConnectionState() {
    return this.state;
  }

  emit(event: unknown) {
    for (const listener of this.eventListeners) listener(event);
  }

  private setConnectionState(state: RealtimeConnectionState) {
    this.state = state;
    for (const listener of this.connectionListeners) listener(state);
  }
}

async function openShipment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText("SHP-100000"));
  const sheet = await screen.findByRole("dialog");
  await within(sheet).findByRole("heading", { name: "Shipment information" });
  return sheet;
}

describe("shipment mutations", () => {
  it("reconciles a successful acknowledgement from the canonical response", async () => {
    const user = userEvent.setup();
    setMutationFailureRate(0);
    const { queryClient } = renderApp();
    const sheet = await openShipment(user);
    const before = queryClient.getQueryData<ShipmentDetails>(
      operationsKeys.detail("SHP-100000"),
    )!;

    setMutationDelay(100);
    await user.click(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    );

    expect(
      queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      ),
    ).toMatchObject({
      status: "ACKNOWLEDGED",
      version: before.version,
    });
    await waitFor(() => {
      expect(
        within(sheet).getByText("acknowledged", { selector: "dd" }),
      ).toBeInTheDocument();
      expect(
        within(sheet).getByText("Exception acknowledged."),
      ).toBeInTheDocument();
    });
    expect(
      queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      ),
    ).toMatchObject({
      status: "ACKNOWLEDGED",
      version: before.version + 1,
    });
  });

  it("assigns an operator and settles to the server response", async () => {
    const user = userEvent.setup();
    setMutationFailureRate(0);
    const { queryClient } = renderApp();
    const sheet = await openShipment(user);
    const before = queryClient.getQueryData<ShipmentDetails>(
      operationsKeys.detail("SHP-100000"),
    )!;

    await user.selectOptions(within(sheet).getByLabelText("Operator"), "OP-03");
    setMutationDelay(100);
    await user.click(
      within(sheet).getByRole("button", { name: "Assign shipment" }),
    );

    expect(
      queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      ),
    ).toMatchObject({
      assignedTo: { id: "OP-03", name: "Operator 03" },
      version: before.version,
    });
    await waitFor(() => {
      expect(
        within(sheet).getByText("Operator 03", {
          selector: "section p",
        }),
      ).toBeInTheDocument();
      expect(
        within(sheet).getByText("Assigned to Operator 03."),
      ).toBeInTheDocument();
    });
    expect(
      queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      ),
    ).toMatchObject({
      assignedTo: { id: "OP-03", name: "Operator 03" },
      version: before.version + 1,
    });
  });

  it("rolls a failed optimistic acknowledgement back in the filtered flow", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderApp();

    await user.selectOptions(screen.getByLabelText("Origin port"), "IRBND");
    await waitFor(() =>
      expect(screen.getByLabelText("Origin port")).toHaveValue("IRBND"),
    );

    const sheet = await openShipment(user);
    await user.selectOptions(within(sheet).getByLabelText("Operator"), "OP-03");
    setMutationDelay(100);
    forceNextMutationResult("failure");
    await user.click(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    );

    expect(
      within(sheet).getByRole("button", { name: "Updating…" }),
    ).toBeDisabled();
    expect(within(sheet).getByLabelText("Operator")).toBeDisabled();
    expect(
      within(sheet).getByRole("button", { name: "Assign shipment" }),
    ).toBeDisabled();
    expect(
      within(sheet).getByText("acknowledged", { selector: "dd" }),
    ).toBeInTheDocument();
    expect(
      queryClient
        .getQueriesData<{ items: Array<{ id: string; status: string }> }>({
          queryKey: ["operations", "shipments", "list"],
        })
        .flatMap(([, data]) => data?.items ?? [])
        .find(({ id }) => id === "SHP-100000")?.status,
    ).toBe("ACKNOWLEDGED");

    expect(
      await within(sheet).findByText("Shipment update failed"),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText("open", { selector: "dd" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).queryByText("acknowledged", { selector: "dd" }),
    ).not.toBeInTheDocument();
    expect(
      within(sheet).getByText(/optimistic update was rolled back/i),
    ).toBeInTheDocument();
    expect(
      queryClient
        .getQueriesData<{ items: Array<{ id: string; status: string }> }>({
          queryKey: ["operations", "shipments", "list"],
        })
        .flatMap(([, data]) => data?.items ?? [])
        .find(({ id }) => id === "SHP-100000")?.status,
    ).toBe("OPEN");

    setMutationFailureRate(0);
    await user.click(
      within(sheet).getByRole("button", { name: "Assign shipment" }),
    );
    expect(
      within(sheet).queryByText("Shipment update failed"),
    ).not.toBeInTheDocument();
    expect(
      await within(sheet).findByText("Assigned to Operator 03."),
    ).toBeInTheDocument();
  });

  it("preserves newer realtime truth through a delayed 409 and converges list and detail", async () => {
    const user = userEvent.setup();
    const realtimeSource = new ManualShipmentEventSource();
    const { queryClient } = renderApp({ realtimeSource });
    const registry = getReconciliationRegistry(queryClient);

    await user.selectOptions(screen.getByLabelText("Origin port"), "IRBND");
    await waitFor(() =>
      expect(screen.getByLabelText("Origin port")).toHaveValue("IRBND"),
    );
    const sheet = await openShipment(user);
    const before = queryClient.getQueryData<ShipmentDetails>(
      operationsKeys.detail("SHP-100000"),
    )!;

    setMutationFailureRate(0);
    setMutationDelay(100);
    const mutationPreflight = waitForNextMutationPreflight();
    await user.click(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    );
    await mutationPreflight;
    expect(registry.getPendingMutation(before.id)).toBeDefined();

    const event = shipmentRepository.applyRandomRealtimeUpdate(() => 0);
    act(() => realtimeSource.emit(event));

    expect(
      queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      ),
    ).toMatchObject({
      status: "ACKNOWLEDGED",
      version: event.version,
      ...event.payload,
    });

    expect(
      await within(sheet).findByText("Shipment update failed", undefined, {
        timeout: 4_000,
      }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(/Expected version .* current version is/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      const detail = queryClient.getQueryData<ShipmentDetails>(
        operationsKeys.detail(before.id),
      );
      const listItem = queryClient
        .getQueriesData<ShipmentListResponse>({
          queryKey: operationsKeys.lists(),
        })
        .flatMap(([, data]) => data?.items ?? [])
        .find(({ id }) => id === before.id);

      expect(detail).toMatchObject({
        status: before.status,
        version: event.version,
        ...event.payload,
      });
      expect(listItem).toMatchObject({
        status: detail?.status,
        version: detail?.version,
        priority: detail?.priority,
        updatedAt: detail?.updatedAt,
      });
      expect(shipmentRepository.get(before.id)).toMatchObject({
        status: before.status,
        version: event.version,
        ...event.payload,
      });
      expect(registry.getPendingMutation(before.id)).toBeUndefined();
    });
  });
});
