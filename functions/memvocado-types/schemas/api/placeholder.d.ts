import { z } from "zod";
export declare const AddPlaceholderDataRequestSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    createUser: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    userId?: string | undefined;
    createUser?: boolean | undefined;
}, {
    userId?: string | undefined;
    createUser?: boolean | undefined;
}>;
export type AddPlaceholderDataRequest = z.infer<typeof AddPlaceholderDataRequestSchema>;
export declare const AddPlaceholderDataResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    userId: z.ZodString;
    decksCreated: z.ZodNumber;
    totalCards: z.ZodNumber;
    deckIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    totalCards: number;
    userId: string;
    success: boolean;
    decksCreated: number;
    deckIds: string[];
}, {
    totalCards: number;
    userId: string;
    success: boolean;
    decksCreated: number;
    deckIds: string[];
}>;
export type AddPlaceholderDataResponse = z.infer<typeof AddPlaceholderDataResponseSchema>;
