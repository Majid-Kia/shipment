import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getOperators, getShipment, getShipments } from "@/api/shipments-api";
import type { ShipmentListParams } from "@/api/shipment-contracts";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { useRealtimeConnectionState } from "@/realtime/realtime-provider";

export function useShipmentsQuery(params: ShipmentListParams) {
  const connectionState = useRealtimeConnectionState();
  return useQuery({
    queryKey: operationsKeys.list(params),
    queryFn: ({ signal }) => getShipments(params, signal),
    placeholderData: keepPreviousData,
    refetchInterval: connectionState === "connected" ? 60_000 : 15_000,
  });
}

export function useShipmentDetailsQuery(id: string | null) {
  return useQuery({
    queryKey: operationsKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getShipment(id ?? "", signal),
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
