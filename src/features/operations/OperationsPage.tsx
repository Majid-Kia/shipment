import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/features/operations/components/Pagination";
import { ShipmentFilters } from "@/features/operations/components/ShipmentFilters";
import { ShipmentTable } from "@/features/operations/components/ShipmentTable";
import { SummaryCards } from "@/features/operations/components/SummaryCards";
import { ShipmentDetailsSheet } from "@/features/operations/components/ShipmentDetailsSheet";
import {
  PAGE_SIZE,
  type OperationsSearchState,
  parseOperationsSearchParams,
  serializeOperationsSearchState,
  toShipmentListParams,
} from "@/features/operations/operations-search-params";
import { useShipmentsQuery } from "@/features/operations/operations-queries";
import { useRealtimeConnectionState } from "@/realtime/realtime-context";

function RealtimeConnectionIndicator() {
  const state = useRealtimeConnectionState();
  return (
    <p
      className={
        state === "connected"
          ? "text-sm text-emerald-700"
          : "text-sm text-amber-700"
      }
      role="status"
    >
      Realtime: {state}
    </p>
  );
}

export function OperationsPage() {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => parseOperationsSearchParams(searchParams),
    [searchParams],
  );
  const canonicalSearch = serializeOperationsSearchState(filters).toString();
  const listParams = useMemo(() => toShipmentListParams(filters), [filters]);
  const shipmentsQuery = useShipmentsQuery(listParams);

  useEffect(() => {
    if (searchParams.toString() !== canonicalSearch) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [canonicalSearch, searchParams, setSearchParams]);

  const updateFilters = useCallback(
    (
      changes: Partial<OperationsSearchState>,
      options?: { replace?: boolean },
    ) => {
      setSearchParams(
        serializeOperationsSearchState({
          ...filters,
          ...changes,
          page: 1,
        }),
        { replace: options?.replace ?? false },
      );
    },
    [filters, setSearchParams],
  );

  const changePage = useCallback(
    (page: number) => {
      setSearchParams(serializeOperationsSearchState({ ...filters, page }), {
        replace: false,
      });
    },
    [filters, setSearchParams],
  );

  const pageCount = shipmentsQuery.data
    ? Math.ceil(shipmentsQuery.data.total / PAGE_SIZE)
    : 0;

  useEffect(() => {
    if (
      !shipmentsQuery.data ||
      shipmentsQuery.isPlaceholderData ||
      filters.page <= Math.max(pageCount, 1)
    ) {
      return;
    }
    setSearchParams(
      serializeOperationsSearchState({
        ...filters,
        page: Math.max(pageCount, 1),
      }),
      { replace: true },
    );
  }, [
    filters,
    pageCount,
    setSearchParams,
    shipmentsQuery.data,
    shipmentsQuery.isPlaceholderData,
  ]);

  return (
    <section aria-labelledby="operations-heading" className="space-y-5">
      <div>
        <h1 id="operations-heading" className="text-2xl font-semibold">
          Shipment Exception Board
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor active operational exceptions across the shipment network.
        </p>
      </div>

      <RealtimeConnectionIndicator />

      <ShipmentFilters
        filters={filters}
        onClear={() =>
          setSearchParams(new URLSearchParams(), { replace: false })
        }
        onFilterChange={updateFilters}
      />

      {shipmentsQuery.isPending ? (
        <BoardSkeleton />
      ) : shipmentsQuery.isError && !shipmentsQuery.data ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load shipments</AlertTitle>
          <AlertDescription>
            <p>The shipment list could not be loaded.</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void shipmentsQuery.refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : shipmentsQuery.data ? (
        <>
          <SummaryCards summary={shipmentsQuery.data.summary} />
          {shipmentsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Latest refresh failed</AlertTitle>
              <AlertDescription>
                Showing the most recently loaded shipment data.
              </AlertDescription>
            </Alert>
          ) : null}
          {shipmentsQuery.data.items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <h2 className="text-sm font-medium">No shipments found</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust or clear the active filters.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() =>
                  setSearchParams(new URLSearchParams(), { replace: false })
                }
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div
              aria-busy={shipmentsQuery.isFetching}
              className={
                shipmentsQuery.isFetching ? "space-y-4 opacity-60" : "space-y-4"
              }
            >
              <ShipmentTable
                shipments={shipmentsQuery.data.items}
                pageCount={pageCount}
                selectedShipmentId={selectedShipmentId}
                onSelectShipment={setSelectedShipmentId}
              />
              <Pagination
                page={filters.page}
                pageCount={pageCount}
                total={shipmentsQuery.data.total}
                onPageChange={changePage}
              />
            </div>
          )}
        </>
      ) : null}
      <ShipmentDetailsSheet
        shipmentId={selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
      />
    </section>
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
