import type { ShipmentSummary } from "@/features/operations/api/operations-contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const summaryItems = [
  ["totalExceptions", "Total exceptions"],
  ["criticalExceptions", "Critical exceptions"],
  ["unassignedShipments", "Unassigned shipments"],
  ["acknowledgedExceptions", "Acknowledged exceptions"],
] as const;

export function SummaryCards({ summary }: { summary: ShipmentSummary }) {
  return (
    <section
      aria-label="Shipment summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {summaryItems.map(([key, label]) => (
        <Card key={key} size="sm">
          <CardHeader>
            <CardTitle>{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {summary[key].toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
