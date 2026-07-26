import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShipmentListResponse } from "@/domain/contracts";
import type { Shipment } from "@/domain/shipment";
import { Pagination } from "@/features/operations/components/Pagination";
import { ShipmentTable } from "@/features/operations/components/ShipmentTable";
import { SummaryCards } from "@/features/operations/components/SummaryCards";

interface OperationsBoardProps {
  data: ShipmentListResponse | undefined;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  onClear: () => void;
  onPageChange: (page: number) => void;
  onRefetch: () => void;
  onSelectShipment: (shipmentId: string) => void;
  page: number;
  pageCount: number;
  selectedShipmentId: string | null;
}

export function OperationsBoard({
  data,
  isError,
  isFetching,
  isPending,
  onClear,
  onPageChange,
  onRefetch,
  onSelectShipment,
  page,
  pageCount,
  selectedShipmentId,
}: OperationsBoardProps) {
  if (isPending) {
    return <BoardSkeleton />;
  }

  if (isError && !data) {
    return <BoardInitialError onRetry={onRefetch} />;
  }

  if (!data) return null;

  return (
    <>
      <SummaryCards summary={data.summary} />
      {isError && <BoardRefreshError />}
      <ShipmentResults
        isFetching={isFetching}
        page={page}
        pageCount={pageCount}
        selectedShipmentId={selectedShipmentId}
        shipments={data.items}
        total={data.total}
        onClear={onClear}
        onPageChange={onPageChange}
        onSelectShipment={onSelectShipment}
      />
    </>
  );
}

function BoardInitialError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Unable to load shipments</AlertTitle>
      <AlertDescription>
        <p>The shipment list could not be loaded.</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function BoardRefreshError() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Latest refresh failed</AlertTitle>
      <AlertDescription>
        Showing the most recently loaded shipment data.
      </AlertDescription>
    </Alert>
  );
}

interface ShipmentResultsProps {
  isFetching: boolean;
  onClear: () => void;
  onPageChange: (page: number) => void;
  onSelectShipment: (shipmentId: string) => void;
  page: number;
  pageCount: number;
  selectedShipmentId: string | null;
  shipments: Shipment[];
  total: number;
}

function ShipmentResults({
  isFetching,
  onClear,
  onPageChange,
  onSelectShipment,
  page,
  pageCount,
  selectedShipmentId,
  shipments,
  total,
}: ShipmentResultsProps) {
  if (shipments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <h2 className="text-sm font-medium">No shipments found</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjust or clear the active filters.
        </p>
        <Button className="mt-4" variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-busy={isFetching}
      className={isFetching ? "space-y-4 opacity-60" : "space-y-4"}
    >
      <ShipmentTable
        shipments={shipments}
        pageCount={pageCount}
        selectedShipmentId={selectedShipmentId}
        onSelectShipment={onSelectShipment}
      />
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div aria-label="Loading shipments" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-24" key={index} />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
