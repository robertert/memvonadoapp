import { z } from "zod";

// Supported languages for translation
export const SUPPORTED_LANGUAGES = ["en", "pl", "de", "es", "fr", "it", "pt"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SupportedLanguageSchema = z.enum(SUPPORTED_LANGUAGES);

// Daily translation limit per user
export const DAILY_TRANSLATION_LIMIT = 200;

// ===========================
// Translation request schemas
// ===========================

export const TranslateTextRequestSchema = z
  .object({
    text: z.string().min(1).max(3000),
    fromLanguage: SupportedLanguageSchema,
    toLanguage: SupportedLanguageSchema,
  })
  .strict()
  .refine((data) => data.fromLanguage !== data.toLanguage, {
    message: "Source and target languages must be different",
  });
export type TranslateTextRequest = z.infer<typeof TranslateTextRequestSchema>;

export const GetTranslationLimitRequestSchema = z.object({}).strict();
export type GetTranslationLimitRequest = z.infer<typeof GetTranslationLimitRequestSchema>;

// ===========================
// Translation response schemas
// ===========================

export const TranslateTextResponseSchema = z.object({
  success: z.boolean(),
  translatedText: z.string().nullable(),
  fromLanguage: SupportedLanguageSchema,
  toLanguage: SupportedLanguageSchema,
  remainingToday: z.number().min(0),
  isLimitReached: z.boolean(),
});
export type TranslateTextResponse = z.infer<typeof TranslateTextResponseSchema>;

export const GetTranslationLimitResponseSchema = z.object({
  usedToday: z.number().min(0),
  remainingToday: z.number().min(0),
  dailyLimit: z.number().min(0),
  isLimitReached: z.boolean(),
  resetsAt: z.string(), // ISO date string for midnight UTC
});
export type GetTranslationLimitResponse = z.infer<typeof GetTranslationLimitResponseSchema>;

// ===========================
// Translation usage tracking (Firestore)
// ===========================

export const TranslationUsageSchema = z.object({
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  count: z.number().min(0),
  lastUsedAt: z.date(),
});
export type TranslationUsage = z.infer<typeof TranslationUsageSchema>;
