import { z } from "zod";

import { operatorSchema } from "@/entities/operator/model/operator";

export const operatorsResponseSchema = z.strictObject({
  items: z.array(operatorSchema),
});

export type OperatorsResponse = z.infer<typeof operatorsResponseSchema>;
