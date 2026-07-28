import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("application foundation", () => {
  it("renders the operations route through the real application providers", async () => {
    const { router } = renderApp({ initialEntries: ["/"] });

    expect(
      screen.getByRole("status", { name: "Loading shipments" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Shipment Exception Board",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/operations");
  });
});
