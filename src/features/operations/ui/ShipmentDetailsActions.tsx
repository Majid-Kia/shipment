import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { SheetFooter } from "@/shared/ui/sheet";
import { ApiClientError } from "@/shared/api/errors";
import { can } from "@/auth/permissions";
import { useRole } from "@/auth/role-context";
import type { ShipmentDetails } from "@/entities/shipment/model/shipment";
import { useShipmentMutations } from "@/features/operations/model/operations-mutations";
import { useOperatorsQuery } from "@/features/operations/model/operations-queries";

export function ShipmentDetailsActions({
  shipment,
}: {
  shipment: ShipmentDetails;
}) {
  const { role } = useRole();
  if (!can(role, "shipment:acknowledge")) {
    return (
      <SheetFooter className="border-t">
        <p className="text-muted-foreground">
          Operator role required to acknowledge or assign shipments.
        </p>
      </SheetFooter>
    );
  }

  return (
    <OperatorActions
      canAssign={can(role, "shipment:assign")}
      shipment={shipment}
    />
  );
}

function OperatorActions({
  canAssign,
  shipment,
}: {
  canAssign: boolean;
  shipment: ShipmentDetails;
}) {
  const [operatorId, setOperatorId] = useState("");
  const operatorsQuery = useOperatorsQuery();
  const mutations = useShipmentMutations(shipment.id);
  const selectedOperator = operatorsQuery.data?.items.find(
    ({ id }) => id === operatorId,
  );

  return (
    <SheetFooter className="sticky bottom-0 border-t bg-white">
      {operatorsQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load available operators</AlertTitle>
          <AlertDescription>
            Assignment is temporarily unavailable. Shipment details remain
            usable.
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void operatorsQuery.refetch()}
            >
              Retry operators
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {mutations.error && (
        <Alert variant="destructive">
          <AlertTitle>Shipment update failed</AlertTitle>
          <AlertDescription>
            {mutationErrorMessage(mutations.error)}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full gap-2">
          {canAssign && (
            <div className="grow">
              <label className="sr-only" htmlFor="operator-assignment">
                Operator
              </label>
              <select
                aria-label="Operator"
                className="h-8 min-w-36 rounded-md border bg-background px-2"
                disabled={
                  operatorsQuery.isPending ||
                  shipment.status === "RESOLVED" ||
                  mutations.isPending
                }
                id="operator-assignment"
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
              >
                <option value="">Select operator</option>
                {operatorsQuery.data?.items.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {canAssign && (
            <Button
              disabled={
                !selectedOperator ||
                shipment.status === "RESOLVED" ||
                mutations.isPending
              }
              variant="outline"
              onClick={() =>
                selectedOperator &&
                mutations.assign(selectedOperator, shipment.version)
              }
              size="lg"
              className="grow"
            >
              Assign shipment
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={shipment.status !== "OPEN" || mutations.isPending}
            onClick={() => mutations.acknowledge(shipment.version)}
            size="lg"
            className="w-full"
          >
            {mutations.isPending ? "Updating…" : "Acknowledge exception"}
          </Button>
        </div>
      </div>
    </SheetFooter>
  );
}

function mutationErrorMessage(error: Error) {
  if (error instanceof ApiClientError) {
    return `${error.appError.message} The optimistic update was rolled back.`;
  }
  return "The shipment could not be updated. The optimistic update was rolled back.";
}
