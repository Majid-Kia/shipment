import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OperationsPage() {
  return (
    <section aria-labelledby="operations-heading">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 id="operations-heading">Shipment Exception Board</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Operations workspace foundation is ready.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
