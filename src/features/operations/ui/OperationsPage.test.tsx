import { HttpResponse, http } from "msw";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { server } from "@/mocks/server";
import { renderApp } from "@/test/render-app";

describe("operations URL state", () => {
  it("hydrates every shareable filter and page from the URL", async () => {
    const { router } = renderApp({
      initialEntries: [
        "/operations?search=SHP-100&exceptionType=DELAYED&priority=HIGH&status=OPEN&origin=IRBND&assigned=false&page=2",
      ],
    });

    expect(screen.getByLabelText("Search shipments")).toHaveValue("SHP-100");
    expect(screen.getByLabelText("Exception type")).toHaveValue("DELAYED");
    expect(screen.getByLabelText("Priority")).toHaveValue("HIGH");
    expect(screen.getByLabelText("Status")).toHaveValue("OPEN");
    expect(screen.getByLabelText("Origin port")).toHaveValue("IRBND");
    expect(screen.getByLabelText("Assignment")).toHaveValue("false");
    expect(router.state.location.search).toContain("page=2");
    expect(
      await screen.findByRole(
        "region",
        { name: "Shipment summary" },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
  });

  it("writes discrete filter changes to the URL and resets page", async () => {
    const user = userEvent.setup();
    const { router } = renderApp({
      initialEntries: ["/operations?status=OPEN&page=2"],
    });

    await user.selectOptions(screen.getByLabelText("Priority"), "CRITICAL");

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.get("status")).toBe("OPEN");
      expect(params.get("priority")).toBe("CRITICAL");
      expect(params.has("page")).toBe(false);
    });
  });

  it("debounces search into the URL and resets page", async () => {
    const user = userEvent.setup();
    const { router } = renderApp({
      initialEntries: ["/operations?page=3"],
    });
    const search = screen.getByLabelText("Search shipments");

    await user.type(search, "SHP-100000");

    await waitFor(
      () => {
        const params = new URLSearchParams(router.state.location.search);
        expect(params.get("search")).toBe("SHP-100000");
        expect(params.has("page")).toBe(false);
      },
      { timeout: 1_500 },
    );
    expect(
      await screen.findByText("SHP-100000", undefined, { timeout: 4_000 }),
    ).toBeInTheDocument();
  });

  it("keeps the search draft synchronized with browser navigation", async () => {
    const { router } = renderApp({
      initialEntries: ["/operations?search=first"],
    });

    expect(screen.getByLabelText("Search shipments")).toHaveValue("first");
    await act(() => router.navigate("/operations?search=second"));

    expect(screen.getByLabelText("Search shipments")).toHaveValue("second");
  });

  it("canonicalizes invalid/default/unknown URL parameters", async () => {
    const { router } = renderApp({
      initialEntries: [
        "/operations?status=INVALID&assigned=maybe&page=0&unknown=value",
      ],
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(screen.getByLabelText("Status")).toHaveValue("");
    expect(screen.getByLabelText("Assignment")).toHaveValue("");
  });

  it("preserves valid URL parameters when neighboring values are invalid", async () => {
    const { router } = renderApp({
      initialEntries: [
        "/operations?status=OPEN&priority=INVALID&assigned=false&page=2&unknown=value",
      ],
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        "?status=OPEN&assigned=false&page=2",
      );
    });
    expect(screen.getByLabelText("Status")).toHaveValue("OPEN");
    expect(screen.getByLabelText("Priority")).toHaveValue("");
    expect(screen.getByLabelText("Assignment")).toHaveValue("false");
  });
});

describe("operations list states", () => {
  it("shows an empty state for filters with no matches", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(
      screen.getByLabelText("Search shipments"),
      "DOES-NOT-EXIST",
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: "No shipments found" },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
  });

  it("shows an actionable error when the initial list request fails", async () => {
    server.use(
      http.get("/api/shipments", () =>
        HttpResponse.json(
          {
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Unavailable",
              requestId: "req-test",
              retryable: true,
            },
          },
          { status: 503 },
        ),
      ),
    );
    renderApp();

    expect(
      await screen.findByText("Unable to load shipments", undefined, {
        timeout: 4_000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
