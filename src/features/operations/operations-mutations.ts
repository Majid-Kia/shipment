import { useMutation, useQueryClient } from "@tanstack/react-query";

import { acknowledgeShipment, assignShipment } from "@/api/shipments-api";
import { useRole } from "@/auth/role-context";
import type { Operator } from "@/domain/operator";
import { ApiClientError } from "@/domain/errors";
import {
  snapshotAndOptimisticallyUpdate,
  toOptimisticOverlay,
} from "@/features/operations/operations-cache";
import {
  reconcileMutationFailure,
  reconcileMutationSuccess,
} from "@/features/operations/mutation-reconciliation";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { getReconciliationRegistry } from "@/realtime/reconciliation-registry";

export function useShipmentMutations(shipmentId: string) {
  const queryClient = useQueryClient();
  const registry = getReconciliationRegistry(queryClient);
  const { role } = useRole();

  const acknowledge = useMutation({
    mutationFn: async ({ expectedVersion }: { expectedVersion: number }) =>
      acknowledgeShipment(shipmentId, { expectedVersion }, role),
    onMutate: async () => {
      const change = { type: "acknowledge" as const };
      const { snapshot, expectedVersion } =
        await snapshotAndOptimisticallyUpdate(queryClient, shipmentId, change);
      registry.beginMutation(
        shipmentId,
        expectedVersion,
        toOptimisticOverlay(change),
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) {
        reconcileMutationFailure(
          queryClient,
          registry,
          shipmentId,
          context.snapshot,
        );
      }
      invalidateConflictDetail(error, queryClient, shipmentId);
    },
    onSuccess: ({ shipment }) => {
      reconcileMutationSuccess(queryClient, registry, shipment);
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
      const change = { type: "assign" as const, operator };
      const { snapshot, expectedVersion } =
        await snapshotAndOptimisticallyUpdate(queryClient, shipmentId, change);
      registry.beginMutation(
        shipmentId,
        expectedVersion,
        toOptimisticOverlay(change),
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) {
        reconcileMutationFailure(
          queryClient,
          registry,
          shipmentId,
          context.snapshot,
        );
      }
      invalidateConflictDetail(error, queryClient, shipmentId);
    },
    onSuccess: ({ shipment }) => {
      reconcileMutationSuccess(queryClient, registry, shipment);
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

function invalidateConflictDetail(
  error: Error,
  queryClient: ReturnType<typeof useQueryClient>,
  shipmentId: string,
) {
  if (
    error instanceof ApiClientError &&
    error.appError.kind === "http" &&
    error.appError.status === 409
  ) {
    void queryClient.invalidateQueries({
      queryKey: operationsKeys.detail(shipmentId),
    });
  }
}
