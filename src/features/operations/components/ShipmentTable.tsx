import { memo } from "react";

import type { Shipment } from "@/domain/shipment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

const columnHeaders = [
  "Shipment Number",
  "Origin",
  "Destination",
  "ETA",
  "Exception",
  "Priority",
  "Status",
  "Assigned To",
  "Last Updated",
] as const;

export const ShipmentTable = memo(function ShipmentTable({
  shipments,
  selectedShipmentId,
  onSelectShipment,
}: {
  shipments: Shipment[];
  selectedShipmentId: string | null;
  onSelectShipment: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columnHeaders.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => (
            <ShipmentRow
              isSelected={shipment.id === selectedShipmentId}
              key={shipment.id}
              shipment={shipment}
              onSelect={onSelectShipment}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

const ShipmentRow = memo(function ShipmentRow({
  shipment,
  isSelected,
  onSelect,
}: {
  shipment: Shipment;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const select = () => onSelect(shipment.id);
  return (
    <TableRow
      aria-selected={isSelected}
      className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      onClick={select}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      }}
    >
      <TableCell className="whitespace-nowrap">
        {shipment.shipmentNumber}
      </TableCell>
      <TableCell className="whitespace-nowrap">{shipment.originPort}</TableCell>
      <TableCell className="whitespace-nowrap">
        {shipment.destinationPort}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {dateFormatter.format(new Date(shipment.eta))}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {readable(shipment.exceptionType)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {readable(shipment.priority)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {readable(shipment.status)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {shipment.assignedTo?.name ?? "Unassigned"}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {dateFormatter.format(new Date(shipment.updatedAt))}
      </TableCell>
    </TableRow>
  );
});
