import { z } from "zod";
/**
 * Sesja nauki
 */
export declare const StudySessionCreateSchema: z.ZodObject<{
    deckId: z.ZodString;
    cardId: z.ZodOptional<z.ZodString>;
    grade: z.ZodOptional<z.ZodNumber>;
    reviewTime: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    reviewTime: Date;
    grade?: number | undefined;
    cardId?: string | undefined;
}, {
    deckId: string;
    grade?: number | undefined;
    cardId?: string | undefined;
    reviewTime?: unknown;
}>;
export type StudySessionCreate = z.infer<typeof StudySessionCreateSchema>;
export declare const StudySessionSchema: z.ZodObject<{
    deckId: z.ZodString;
    cardId: z.ZodOptional<z.ZodString>;
    grade: z.ZodOptional<z.ZodNumber>;
    reviewTime: z.ZodEffects<z.ZodDate, Date, unknown>;
} & {
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    deckId: string;
    reviewTime: Date;
    grade?: number | undefined;
    cardId?: string | undefined;
}, {
    id: string;
    deckId: string;
    grade?: number | undefined;
    cardId?: string | undefined;
    reviewTime?: unknown;
}>;
export type StudySession = z.infer<typeof StudySessionSchema>;
