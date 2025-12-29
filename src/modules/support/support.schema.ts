// file: src/modules/support/support.schema.ts

import { z } from "zod";

export const contactAdminSchema = z.object({
  body: z.object({
    email: z.email("Invalid email address"),
    subject: z.string().min(3, "Subject is required").max(150),
    message: z.string().min(10, "Message is required").max(2000),
  }),
});
