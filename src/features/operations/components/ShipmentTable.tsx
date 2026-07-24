import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { Shipment } from "@/domain/shipment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const columnHelper = createColumnHelper<Shipment>();
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

const columns = [
  columnHelper.accessor("shipmentNumber", { header: "Shipment Number" }),
  columnHelper.accessor("originPort", { header: "Origin" }),
  columnHelper.accessor("destinationPort", { header: "Destination" }),
  columnHelper.accessor("eta", {
    header: "ETA",
    cell: ({ getValue }) => dateFormatter.format(new Date(getValue())),
  }),
  columnHelper.accessor("exceptionType", {
    header: "Exception",
    cell: ({ getValue }) => readable(getValue()),
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: ({ getValue }) => readable(getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => readable(getValue()),
  }),
  columnHelper.accessor("assignedTo", {
    header: "Assigned To",
    cell: ({ getValue }) => getValue()?.name ?? "Unassigned",
  }),
  columnHelper.accessor("updatedAt", {
    header: "Last Updated",
    cell: ({ getValue }) => dateFormatter.format(new Date(getValue())),
  }),
];

export function ShipmentTable({
  shipments,
  pageCount,
  selectedShipmentId,
  onSelectShipment,
}: {
  shipments: Shipment[];
  pageCount: number;
  selectedShipmentId: string | null;
  onSelectShipment: (id: string) => void;
}) {
  const table = useReactTable({
    data: shipments,
    columns,
    getRowId: (shipment) => shipment.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              aria-selected={row.id === selectedShipmentId}
              className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              key={row.id}
              tabIndex={0}
              onClick={() => onSelectShipment(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectShipment(row.id);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell className="whitespace-nowrap" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
