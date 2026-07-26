import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { OperationsBoard } from "@/features/operations/components/OperationsBoard";
import { RealtimeConnectionIndicator } from "@/features/operations/components/RealtimeConnectionIndicator";
import { ShipmentDetailsSheet } from "@/features/operations/components/ShipmentDetailsSheet";
import { ShipmentFilters } from "@/features/operations/components/ShipmentFilters";
import {
  PAGE_SIZE,
  type OperationsSearchState,
  parseOperationsSearchParams,
  serializeOperationsSearchState,
  toShipmentListParams,
} from "@/features/operations/operations-search-params";
import { useShipmentsQuery } from "@/features/operations/operations-queries";

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
  const { data, isError, isFetching, isPending, refetch, isPlaceholderData } =
    useShipmentsQuery(listParams);

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

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const clearFilters = () =>
    setSearchParams(new URLSearchParams(), { replace: false });

  useEffect(() => {
    if (!data || isPlaceholderData || filters.page <= Math.max(pageCount, 1)) {
      return;
    }
    setSearchParams(
      serializeOperationsSearchState({
        ...filters,
        page: Math.max(pageCount, 1),
      }),
      { replace: true },
    );
  }, [filters, pageCount, setSearchParams, data, isPlaceholderData]);

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
        onClear={clearFilters}
        onFilterChange={updateFilters}
      />

      <OperationsBoard
        data={data}
        isError={isError}
        isFetching={isFetching}
        isPending={isPending}
        page={filters.page}
        pageCount={pageCount}
        selectedShipmentId={selectedShipmentId}
        onClear={clearFilters}
        onPageChange={changePage}
        onRefetch={() => void refetch()}
        onSelectShipment={setSelectedShipmentId}
      />
      <ShipmentDetailsSheet
        shipmentId={selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
      />
    </section>
  );
}
