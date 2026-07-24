import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("shipment permission rendering", () => {
  it("hides operator actions from viewers and renders them for operators", async () => {
    const user = userEvent.setup();
    renderApp({ initialRole: "VIEWER" });

    await user.click(await screen.findByText("SHP-100000"));
    const sheet = await screen.findByRole("dialog");

    expect(
      within(sheet).getByText(
        "Operator role required to acknowledge or assign shipments.",
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).queryByRole("button", { name: "Acknowledge exception" }),
    ).not.toBeInTheDocument();
    expect(
      within(sheet).queryByRole("button", { name: "Assign shipment" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Mock role"), "OPERATOR");

    expect(
      within(sheet).getByRole("button", { name: "Acknowledge exception" }),
    ).toBeEnabled();
    expect(
      within(sheet).getByRole("button", { name: "Assign shipment" }),
    ).toBeEnabled();
  });
});
