import { z } from "zod";

export const operatorSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
});

export type Operator = z.infer<typeof operatorSchema>;
