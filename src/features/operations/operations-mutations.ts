import { useMutation, useQueryClient } from "@tanstack/react-query";

import { acknowledgeShipment, assignShipment } from "@/api/shipments-api";
import { useRole } from "@/auth/role-context";
import type { Operator } from "@/domain/operator";
import {
  reconcileCanonicalShipment,
  restoreCacheSnapshot,
  snapshotAndOptimisticallyUpdate,
} from "@/features/operations/operations-cache";
import { operationsKeys } from "@/features/operations/operations-query-keys";

export function useShipmentMutations(shipmentId: string) {
  const queryClient = useQueryClient();
  const { role } = useRole();

  const acknowledge = useMutation({
    mutationFn: async ({ expectedVersion }: { expectedVersion: number }) =>
      acknowledgeShipment(shipmentId, { expectedVersion }, role),
    onMutate: async () => {
      const { snapshot } = await snapshotAndOptimisticallyUpdate(
        queryClient,
        shipmentId,
        {
          type: "acknowledge",
        },
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreCacheSnapshot(queryClient, context.snapshot);
    },
    onSuccess: ({ shipment }) => {
      reconcileCanonicalShipment(queryClient, shipment);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: operationsKeys.lists(),
      });
    },
  });

  const assign = useMutation({
    mutationFn: async ({
      operator,
      expectedVersion,
    }: {
      operator: Operator;
      expectedVersion: number;
    }) =>
      assignShipment(
        shipmentId,
        { operatorId: operator.id, expectedVersion },
        role,
      ),
    onMutate: async ({ operator }) => {
      const { snapshot } = await snapshotAndOptimisticallyUpdate(
        queryClient,
        shipmentId,
        {
          type: "assign",
          operator,
        },
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context) restoreCacheSnapshot(queryClient, context.snapshot);
    },
    onSuccess: ({ shipment }) => {
      reconcileCanonicalShipment(queryClient, shipment);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: operationsKeys.lists(),
      });
    },
  });

  return {
    acknowledge: (expectedVersion: number) =>
      acknowledge.mutate({ expectedVersion }),
    assign: (operator: Operator, expectedVersion: number) =>
      assign.mutate({ operator, expectedVersion }),
    error: acknowledge.error ?? assign.error,
    isPending: acknowledge.isPending || assign.isPending,
    resetError: () => {
      acknowledge.reset();
      assign.reset();
    },
  };
}
