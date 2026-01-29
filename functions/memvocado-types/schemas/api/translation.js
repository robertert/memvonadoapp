"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationUsageSchema = exports.GetTranslationLimitResponseSchema = exports.TranslateTextResponseSchema = exports.GetTranslationLimitRequestSchema = exports.TranslateTextRequestSchema = exports.DAILY_TRANSLATION_LIMIT = exports.SupportedLanguageSchema = exports.SUPPORTED_LANGUAGES = void 0;
const zod_1 = require("zod");
// Supported languages for translation
exports.SUPPORTED_LANGUAGES = ["en", "pl", "de", "es", "fr", "it", "pt"];
exports.SupportedLanguageSchema = zod_1.z.enum(exports.SUPPORTED_LANGUAGES);
// Daily translation limit per user
exports.DAILY_TRANSLATION_LIMIT = 200;
// ===========================
// Translation request schemas
// ===========================
exports.TranslateTextRequestSchema = zod_1.z
    .object({
    text: zod_1.z.string().min(1).max(3000),
    fromLanguage: exports.SupportedLanguageSchema,
    toLanguage: exports.SupportedLanguageSchema,
})
    .strict()
    .refine((data) => data.fromLanguage !== data.toLanguage, {
    message: "Source and target languages must be different",
});
exports.GetTranslationLimitRequestSchema = zod_1.z.object({}).strict();
// ===========================
// Translation response schemas
// ===========================
exports.TranslateTextResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    translatedText: zod_1.z.string().nullable(),
    fromLanguage: exports.SupportedLanguageSchema,
    toLanguage: exports.SupportedLanguageSchema,
    remainingToday: zod_1.z.number().min(0),
    isLimitReached: zod_1.z.boolean(),
});
exports.GetTranslationLimitResponseSchema = zod_1.z.object({
    usedToday: zod_1.z.number().min(0),
    remainingToday: zod_1.z.number().min(0),
    dailyLimit: zod_1.z.number().min(0),
    isLimitReached: zod_1.z.boolean(),
    resetsAt: zod_1.z.string(), // ISO date string for midnight UTC
});
// ===========================
// Translation usage tracking (Firestore)
// ===========================
exports.TranslationUsageSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    date: zod_1.z.string(), // YYYY-MM-DD format
    count: zod_1.z.number().min(0),
    lastUsedAt: zod_1.z.date(),
});
