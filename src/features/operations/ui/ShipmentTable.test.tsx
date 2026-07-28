import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Shipment } from "@/entities/shipment/model/shipment";
import { ShipmentTable } from "@/features/operations/ui/ShipmentTable";

const shipment: Shipment = {
  id: "shipment-1",
  shipmentNumber: "SHP-1",
  originPort: "IRBND",
  destinationPort: "CNSHA",
  eta: "2026-07-25T10:00:00.000Z",
  exceptionType: "DELAYED",
  priority: "HIGH",
  status: "OPEN",
  assignedTo: null,
  version: 1,
  updatedAt: "2026-07-24T10:00:00.000Z",
};

describe("ShipmentTable", () => {
  it("renders the required columns and supports keyboard row selection", async () => {
    const user = userEvent.setup();
    const onSelectShipment = vi.fn<(shipmentId: string) => void>();
    render(
      <ShipmentTable
        shipments={[shipment]}
        selectedShipmentId={null}
        onSelectShipment={onSelectShipment}
      />,
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "Shipment Number",
      "Origin",
      "Destination",
      "ETA",
      "Exception",
      "Priority",
      "Status",
      "Assigned To",
      "Last Updated",
    ]);

    const row = screen.getByRole("row", { name: /SHP-1/ });
    row.focus();
    await user.keyboard("{Enter}");
    expect(onSelectShipment).toHaveBeenCalledWith("shipment-1");
  });
});
