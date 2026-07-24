import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ShipmentDetails } from "@/domain/shipment";
import { ApiClientError } from "@/domain/errors";
import { PermissionGate } from "@/features/operations/components/PermissionGate";
import { useShipmentMutations } from "@/features/operations/operations-mutations";
import {
  useOperatorsQuery,
  useShipmentDetailsQuery,
} from "@/features/operations/operations-queries";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const readable = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function ShipmentDetailsSheet({
  shipmentId,
  onClose,
}: {
  shipmentId: string | null;
  onClose: () => void;
}) {
  const query = useShipmentDetailsQuery(shipmentId);

  return (
    <Sheet
      open={shipmentId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>Shipment details</SheetTitle>
          <SheetDescription>
            Detailed operational exception information.
          </SheetDescription>
        </SheetHeader>

        {query.isPending ? (
          <div aria-label="Loading shipment details" className="space-y-4 p-6">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="h-20" key={index} />
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTitle>Unable to load shipment details</AlertTitle>
              <AlertDescription>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => void query.refetch()}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : query.data ? (
          <DetailsContent shipment={query.data} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailsContent({ shipment }: { shipment: ShipmentDetails }) {
  const [operatorId, setOperatorId] = useState("");
  const operatorsQuery = useOperatorsQuery();
  const mutations = useShipmentMutations(shipment.id);
  const selectedOperator = operatorsQuery.data?.items.find(
    ({ id }) => id === operatorId,
  );

  return (
    <>
      <div className="space-y-6 p-6">
        <DetailSection title="Shipment information">
          <DescriptionList
            items={[
              ["Shipment number", shipment.shipmentNumber],
              ["Route", `${shipment.originPort} → ${shipment.destinationPort}`],
              ["ETA", dateFormatter.format(new Date(shipment.eta))],
              ["Priority", readable(shipment.priority)],
              ["Status", readable(shipment.status)],
              [
                "Last updated",
                dateFormatter.format(new Date(shipment.updatedAt)),
              ],
            ]}
          />
        </DetailSection>

        <DetailSection title="Exception details">
          <Badge variant="outline">{readable(shipment.exceptionType)}</Badge>
          <p className="mt-2">{shipment.exception.description}</p>
          <p className="mt-1 text-muted-foreground">
            Detected{" "}
            {dateFormatter.format(new Date(shipment.exception.detectedAt))}
          </p>
        </DetailSection>

        <DetailSection title="Current assignment">
          <p>{shipment.assignedTo?.name ?? "Unassigned"}</p>
        </DetailSection>

        <DetailSection title="Status history">
          <ol className="space-y-3">
            {shipment.statusHistory.map((entry) => (
              <li className="border-l-2 pl-3" key={entry.id}>
                <p className="font-medium">
                  {entry.from ? `${readable(entry.from)} → ` : ""}
                  {readable(entry.to)}
                </p>
                <p className="text-muted-foreground">
                  {entry.actor} · {dateFormatter.format(new Date(entry.at))}
                </p>
              </li>
            ))}
          </ol>
        </DetailSection>

        <DetailSection title="Latest events">
          <ol className="space-y-3">
            {shipment.recentEvents.slice(0, 5).map((event) => (
              <li className="rounded-md border p-3" key={event.eventId}>
                <p className="font-medium">{readable(event.type)}</p>
                <p>{event.summary}</p>
                <p className="text-muted-foreground">
                  {dateFormatter.format(new Date(event.timestamp))} · v
                  {event.version}
                </p>
              </li>
            ))}
          </ol>
        </DetailSection>
      </div>

      <PermissionGate
        permission="shipment:acknowledge"
        fallback={
          <SheetFooter className="border-t">
            <p className="text-muted-foreground">
              Operator role required to acknowledge or assign shipments.
            </p>
          </SheetFooter>
        }
      >
        <SheetFooter className="border-t">
          {mutations.error ? (
            <Alert variant="destructive">
              <AlertTitle>Shipment update failed</AlertTitle>
              <AlertDescription>
                {mutationErrorMessage(mutations.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={shipment.status !== "OPEN" || mutations.isPending}
              onClick={() => mutations.acknowledge(shipment.version)}
            >
              {mutations.isPending ? "Updating…" : "Acknowledge exception"}
            </Button>
            <PermissionGate permission="shipment:assign">
              <label className="sr-only" htmlFor="operator-assignment">
                Operator
              </label>
              <select
                aria-label="Operator"
                className="h-8 min-w-36 rounded-md border bg-background px-2"
                disabled={
                  operatorsQuery.isPending ||
                  shipment.status === "RESOLVED" ||
                  mutations.isPending
                }
                id="operator-assignment"
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
              >
                <option value="">Select operator</option>
                {operatorsQuery.data?.items.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
              <Button
                disabled={
                  !selectedOperator ||
                  shipment.status === "RESOLVED" ||
                  mutations.isPending
                }
                variant="outline"
                onClick={() =>
                  selectedOperator &&
                  mutations.assign(selectedOperator, shipment.version)
                }
              >
                Assign shipment
              </Button>
            </PermissionGate>
          </div>
        </SheetFooter>
      </PermissionGate>
    </>
  );
}

function mutationErrorMessage(error: Error) {
  if (error instanceof ApiClientError) {
    return `${error.appError.message} The optimistic update was rolled back.`;
  }
  return "The shipment could not be updated. The optimistic update was rolled back.";
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`detail-${title.replaceAll(" ", "-")}`}>
      <h2
        className="mb-3 text-sm font-semibold"
        id={`detail-${title.replaceAll(" ", "-")}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function DescriptionList({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
