import { z } from "zod";
export declare const AVO_SUPPORTED_LANGUAGES: readonly ["pl", "en", "de", "es", "fr"];
export type AvoLanguage = (typeof AVO_SUPPORTED_LANGUAGES)[number];
export declare const AvoLanguageSchema: z.ZodEnum<["pl", "en", "de", "es", "fr"]>;
export declare const DAILY_AVO_QUERY_LIMIT = 50;
export declare const AVO_CHIP_TYPES: readonly ["explain_answer", "mnemonic", "use_in_sentence", "custom"];
export type AvoChipType = (typeof AVO_CHIP_TYPES)[number];
export declare const AvoChipTypeSchema: z.ZodEnum<["explain_answer", "mnemonic", "use_in_sentence", "custom"]>;
export declare const AvoCardContextSchema: z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    deckName: z.ZodDefault<z.ZodString>;
    frontLanguage: z.ZodOptional<z.ZodString>;
    backLanguage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tags: string[];
    front: string;
    back: string;
    deckName: string;
    frontLanguage?: string | undefined;
    backLanguage?: string | undefined;
}, {
    front: string;
    back: string;
    tags?: string[] | undefined;
    frontLanguage?: string | undefined;
    backLanguage?: string | undefined;
    deckName?: string | undefined;
}>;
export type AvoCardContext = z.infer<typeof AvoCardContextSchema>;
export declare const AvoQueryRequestSchema: z.ZodObject<{
    chipType: z.ZodEnum<["explain_answer", "mnemonic", "use_in_sentence", "custom"]>;
    customQuestion: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cardContext: z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        deckName: z.ZodDefault<z.ZodString>;
        frontLanguage: z.ZodOptional<z.ZodString>;
        backLanguage: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        front: string;
        back: string;
        deckName: string;
        frontLanguage?: string | undefined;
        backLanguage?: string | undefined;
    }, {
        front: string;
        back: string;
        tags?: string[] | undefined;
        frontLanguage?: string | undefined;
        backLanguage?: string | undefined;
        deckName?: string | undefined;
    }>;
    responseLanguage: z.ZodEnum<["pl", "en", "de", "es", "fr"]>;
}, "strict", z.ZodTypeAny, {
    chipType: "custom" | "explain_answer" | "mnemonic" | "use_in_sentence";
    cardContext: {
        tags: string[];
        front: string;
        back: string;
        deckName: string;
        frontLanguage?: string | undefined;
        backLanguage?: string | undefined;
    };
    responseLanguage: "en" | "pl" | "de" | "es" | "fr";
    customQuestion?: string | null | undefined;
}, {
    chipType: "custom" | "explain_answer" | "mnemonic" | "use_in_sentence";
    cardContext: {
        front: string;
        back: string;
        tags?: string[] | undefined;
        frontLanguage?: string | undefined;
        backLanguage?: string | undefined;
        deckName?: string | undefined;
    };
    responseLanguage: "en" | "pl" | "de" | "es" | "fr";
    customQuestion?: string | null | undefined;
}>;
export type AvoQueryRequest = z.infer<typeof AvoQueryRequestSchema>;
export declare const AvoQueryResponseSchema: z.ZodObject<{
    answer: z.ZodString;
    remainingToday: z.ZodNumber;
    isLimitReached: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    remainingToday: number;
    isLimitReached: boolean;
    answer: string;
}, {
    remainingToday: number;
    isLimitReached: boolean;
    answer: string;
}>;
export type AvoQueryResponse = z.infer<typeof AvoQueryResponseSchema>;
export declare const GetAvoQueryLimitResponseSchema: z.ZodObject<{
    usedToday: z.ZodNumber;
    remainingToday: z.ZodNumber;
    dailyLimit: z.ZodNumber;
    isLimitReached: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    remainingToday: number;
    isLimitReached: boolean;
    usedToday: number;
    dailyLimit: number;
}, {
    remainingToday: number;
    isLimitReached: boolean;
    usedToday: number;
    dailyLimit: number;
}>;
export type GetAvoQueryLimitResponse = z.infer<typeof GetAvoQueryLimitResponseSchema>;
