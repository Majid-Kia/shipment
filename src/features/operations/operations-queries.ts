import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getShipment, getShipments } from "@/api/shipments-api";
import { getOperators } from "@/api/operators-api";
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

export function useShipmentDetailsQuery(id: string | null) {
  return useQuery({
    queryKey: operationsKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getShipment(id!, signal),
    enabled: id !== null,
  });
}

export function useOperatorsQuery() {
  return useQuery({
    queryKey: operationsKeys.operators(),
    queryFn: ({ signal }) => getOperators(signal),
    staleTime: 10 * 60_000,
  });
}
