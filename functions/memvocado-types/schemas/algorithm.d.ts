import { z } from "zod";
/**
 * Wynik algorytmu SuperMemo2
 */
export declare const SuperMemoResultSchema: z.ZodObject<{
    interval: z.ZodNumber;
    difficulty: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    difficulty: number;
    interval: number;
}, {
    difficulty: number;
    interval: number;
}>;
export type SuperMemoResult = z.infer<typeof SuperMemoResultSchema>;
