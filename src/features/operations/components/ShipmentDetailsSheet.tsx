import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ShipmentDetails } from "@/domain/shipment";
import { ShipmentDetailsActions } from "@/features/operations/components/ShipmentDetailsActions";
import { ShipmentDetailsContent } from "@/features/operations/components/ShipmentDetailsContent";
import { useShipmentDetailsQuery } from "@/features/operations/operations-queries";

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

        <ShipmentDetailsBody
          data={query.data}
          isError={query.isError}
          isPending={query.isPending}
          onRetry={() => void query.refetch()}
        />
      </SheetContent>
    </Sheet>
  );
}

interface ShipmentDetailsBodyProps {
  data: ShipmentDetails | undefined;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
}

function ShipmentDetailsBody({
  data,
  isError,
  isPending,
  onRetry,
}: ShipmentDetailsBodyProps) {
  if (isPending) {
    return (
      <div aria-label="Loading shipment details" className="space-y-4 p-6">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="h-20" key={index} />
        ))}
      </div>
    );
  }

  if (isError && !data) {
    return <ShipmentDetailsInitialError onRetry={onRetry} />;
  }

  if (!data) return null;

  return (
    <>
      {isError && <ShipmentDetailsRefreshError onRetry={onRetry} />}
      <ShipmentDetailsContent shipment={data} />
      <ShipmentDetailsActions shipment={data} />
    </>
  );
}

function ShipmentDetailsInitialError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertTitle>Unable to load shipment details</AlertTitle>
        <AlertDescription>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ShipmentDetailsRefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 pt-6">
      <Alert variant="destructive">
        <AlertTitle>Latest refresh failed</AlertTitle>
        <AlertDescription>
          <p>Showing the most recently loaded shipment details.</p>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
