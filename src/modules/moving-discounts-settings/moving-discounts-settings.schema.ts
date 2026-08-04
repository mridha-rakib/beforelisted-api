// file: src/modules/moving-discounts-settings/moving-discounts-settings.schema.ts

import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z.object({
    disclaimer: z
      .string()
      .max(5000, "Disclaimer must be less than 5000 characters"),
  }),
});
