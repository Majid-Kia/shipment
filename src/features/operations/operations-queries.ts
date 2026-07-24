import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getShipments } from "@/api/shipments-api";
import type { ShipmentListParams } from "@/domain/contracts";
import { operationsKeys } from "@/features/operations/operations-query-keys";

export function useShipmentsQuery(params: ShipmentListParams) {
  return useQuery({
    queryKey: operationsKeys.list(params),
    queryFn: ({ signal }) => getShipments(params, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
