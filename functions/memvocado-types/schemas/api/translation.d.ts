import { z } from "zod";
export declare const SUPPORTED_LANGUAGES: readonly ["en", "pl", "de", "es", "fr", "it", "pt"];
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export declare const SupportedLanguageSchema: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
export declare const DAILY_TRANSLATION_LIMIT = 200;
export declare const TranslateTextRequestSchema: z.ZodEffects<z.ZodObject<{
    text: z.ZodString;
    fromLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
    toLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
}, "strict", z.ZodTypeAny, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}>, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}>;
export type TranslateTextRequest = z.infer<typeof TranslateTextRequestSchema>;
export declare const GetTranslationLimitRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type GetTranslationLimitRequest = z.infer<typeof GetTranslationLimitRequestSchema>;
export declare const TranslateTextResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    translatedText: z.ZodNullable<z.ZodString>;
    fromLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
    toLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
    remainingToday: z.ZodNumber;
    isLimitReached: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    translatedText: string | null;
    remainingToday: number;
    isLimitReached: boolean;
}, {
    success: boolean;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    translatedText: string | null;
    remainingToday: number;
    isLimitReached: boolean;
}>;
export type TranslateTextResponse = z.infer<typeof TranslateTextResponseSchema>;
export declare const GetTranslationLimitResponseSchema: z.ZodObject<{
    usedToday: z.ZodNumber;
    remainingToday: z.ZodNumber;
    dailyLimit: z.ZodNumber;
    isLimitReached: z.ZodBoolean;
    resetsAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    remainingToday: number;
    isLimitReached: boolean;
    usedToday: number;
    dailyLimit: number;
    resetsAt: string;
}, {
    remainingToday: number;
    isLimitReached: boolean;
    usedToday: number;
    dailyLimit: number;
    resetsAt: string;
}>;
export type GetTranslationLimitResponse = z.infer<typeof GetTranslationLimitResponseSchema>;
export declare const TranslationUsageSchema: z.ZodObject<{
    userId: z.ZodString;
    date: z.ZodString;
    count: z.ZodNumber;
    lastUsedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    date: string;
    userId: string;
    count: number;
    lastUsedAt: Date;
}, {
    date: string;
    userId: string;
    count: number;
    lastUsedAt: Date;
}>;
export type TranslationUsage = z.infer<typeof TranslationUsageSchema>;
export declare const GetTranslationSuggestionsRequestSchema: z.ZodEffects<z.ZodObject<{
    text: z.ZodString;
    fromLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
    toLanguage: z.ZodEnum<["en", "pl", "de", "es", "fr", "it", "pt"]>;
}, "strip", z.ZodTypeAny, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}>, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}, {
    text: string;
    fromLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
    toLanguage: "en" | "pl" | "de" | "es" | "fr" | "it" | "pt";
}>;
export type GetTranslationSuggestionsRequest = z.infer<typeof GetTranslationSuggestionsRequestSchema>;
export declare const GetTranslationSuggestionsResponseSchema: z.ZodObject<{
    suggestions: z.ZodArray<z.ZodString, "many">;
    cached: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    suggestions: string[];
    cached: boolean;
}, {
    suggestions: string[];
    cached: boolean;
}>;
export type GetTranslationSuggestionsResponse = z.infer<typeof GetTranslationSuggestionsResponseSchema>;
