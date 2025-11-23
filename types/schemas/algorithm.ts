import { z } from "zod";

/**
 * Wynik algorytmu SuperMemo2
 */
export const SuperMemoResultSchema = z
  .object({
    interval: z.number().min(0),
    difficulty: z.number().min(0).max(5),
  })
  .strict();

export type SuperMemoResult = z.infer<typeof SuperMemoResultSchema>;
