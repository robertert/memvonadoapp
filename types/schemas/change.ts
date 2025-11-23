import { z } from "zod";

/**
 * Zmiana karty (z typem)
 */
export const CardChangeWithTypeSchema = z
  .object({
    cardId: z.string(),
    type: z.enum(["modified", "deleted", "new"]),
    changes: z
      .array(
        z.object({
          field: z.string(),
          oldValue: z.any(),
          newValue: z.any(),
        })
      )
      .optional(),
  })
  .strict();

export type CardChangeWithType = z.infer<typeof CardChangeWithTypeSchema>;
