import { Badge } from "@/shared/ui/badge";
import type { ShipmentDetails } from "@/entities/shipment/model/shipment";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const readable = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function ShipmentDetailsContent({
  shipment,
}: {
  shipment: ShipmentDetails;
}) {
  return (
    <div className="space-y-6 p-6 pb-24">
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
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `detail-${title.replaceAll(" ", "-")}`;

  return (
    <section aria-labelledby={headingId}>
      <h2 className="mb-3 text-sm font-semibold" id={headingId}>
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
