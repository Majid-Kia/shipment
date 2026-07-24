import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  forceNextMutationResult,
  setMutationDelay,
  setMutationFailureRate,
} from "@/mocks/scenarios";
import { renderApp } from "@/test/render-app";

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

    await user.click(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    );

    await waitFor(() => {
      expect(
        within(sheet).getByText("acknowledged", { selector: "dd" }),
      ).toBeInTheDocument();
      expect(
        within(sheet).getByText("Exception acknowledged."),
      ).toBeInTheDocument();
    });
    expect(
      queryClient.getQueryData<{ status: string }>([
        "operations",
        "shipments",
        "detail",
        "SHP-100000",
      ])?.status,
    ).toBe("ACKNOWLEDGED");
  });

  it("assigns an operator and settles to the server response", async () => {
    const user = userEvent.setup();
    setMutationFailureRate(0);
    renderApp();
    const sheet = await openShipment(user);

    await user.selectOptions(within(sheet).getByLabelText("Operator"), "OP-03");
    await user.click(
      within(sheet).getByRole("button", { name: "Assign shipment" }),
    );

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
  });

  it("rolls a failed optimistic acknowledgement back in the filtered flow", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderApp();

    await user.selectOptions(screen.getByLabelText("Origin port"), "IRBND");
    await waitFor(() =>
      expect(screen.getByLabelText("Origin port")).toHaveValue("IRBND"),
    );

    const sheet = await openShipment(user);
    setMutationDelay(100);
    forceNextMutationResult("failure");
    await user.click(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    );

    expect(
      within(sheet).getByRole("button", { name: "Updating…" }),
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
  });
});
