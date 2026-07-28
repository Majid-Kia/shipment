import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/api/errors";
import { acknowledgeShipment, assignShipment } from "@/api/shipments-api";
import { useRole } from "@/auth/role-context";
import type { Operator } from "@/domain/shipment";
import {
  snapshotAndOptimisticallyUpdate,
  type OptimisticChange,
} from "@/features/operations/operations-cache";
import {
  reconcileMutationFailure,
  reconcileMutationSuccess,
} from "@/features/operations/mutation-reconciliation";
import { operationsKeys } from "@/features/operations/operations-query-keys";
import { getReconciliationRegistry } from "@/realtime/reconciliation-registry";

type ShipmentMutationCommand =
  | { type: "acknowledge"; expectedVersion: number }
  | { type: "assign"; operator: Operator; expectedVersion: number };

export function useShipmentMutations(shipmentId: string) {
  const queryClient = useQueryClient();
  const registry = getReconciliationRegistry(queryClient);
  const { role } = useRole();

  const mutation = useMutation({
    mutationFn: async (command: ShipmentMutationCommand) => {
      if (command.type === "acknowledge") {
        return acknowledgeShipment(
          shipmentId,
          { expectedVersion: command.expectedVersion },
          role,
        );
      }
      return assignShipment(
        shipmentId,
        {
          operatorId: command.operator.id,
          expectedVersion: command.expectedVersion,
        },
        role,
      );
    },
    onMutate: async (command) => {
      if (registry.getPendingMutation(shipmentId)) {
        throw new Error("A mutation is already pending for this shipment.");
      }

      const optimisticChange: OptimisticChange =
        command.type === "acknowledge"
          ? { type: "acknowledge" }
          : { type: "assign", operator: command.operator };
      const { rollbackSnapshot, baseVersion, optimisticOverlay } =
        await snapshotAndOptimisticallyUpdate(
          queryClient,
          shipmentId,
          optimisticChange,
        );
      registry.beginMutation(shipmentId, baseVersion, optimisticOverlay);
      return { rollbackSnapshot };
    },
    onError: (error, _command, context) => {
      if (context) {
        reconcileMutationFailure(
          queryClient,
          registry,
          shipmentId,
          context.rollbackSnapshot,
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
      mutation.mutate({ type: "acknowledge", expectedVersion }),
    assign: (operator: Operator, expectedVersion: number) =>
      mutation.mutate({
        type: "assign",
        operator,
        expectedVersion,
      }),
    error: mutation.error,
    isPending: mutation.isPending,
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
