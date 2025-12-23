// file: src/modules/grant-access/grant-access.schema.ts

import { z } from "zod";

export const getPaymentDetailsSchema = z.object({
  params: z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
  }),
});
