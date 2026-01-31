"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAvoQueryLimitResponseSchema = exports.AvoQueryResponseSchema = exports.AvoQueryRequestSchema = exports.AvoCardContextSchema = exports.AvoChipTypeSchema = exports.AVO_CHIP_TYPES = exports.DAILY_AVO_QUERY_LIMIT = exports.AvoLanguageSchema = exports.AVO_SUPPORTED_LANGUAGES = void 0;
const zod_1 = require("zod");
// Supported languages for AVO responses
exports.AVO_SUPPORTED_LANGUAGES = ["pl", "en", "de", "es", "fr"];
exports.AvoLanguageSchema = zod_1.z.enum(exports.AVO_SUPPORTED_LANGUAGES);
// Daily query limit per user
exports.DAILY_AVO_QUERY_LIMIT = 50;
// Chip types for AVO helper queries
exports.AVO_CHIP_TYPES = [
    "explain_answer",
    "mnemonic",
    "use_in_sentence",
    "custom",
];
exports.AvoChipTypeSchema = zod_1.z.enum(exports.AVO_CHIP_TYPES);
// ===========================
// Card context (sent with each query)
// ===========================
exports.AvoCardContextSchema = zod_1.z.object({
    front: zod_1.z.string().min(1),
    back: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    deckName: zod_1.z.string().default(""),
    frontLanguage: zod_1.z.string().optional(),
    backLanguage: zod_1.z.string().optional(),
});
// ===========================
// avoQuery request/response
// ===========================
exports.AvoQueryRequestSchema = zod_1.z
    .object({
    chipType: exports.AvoChipTypeSchema,
    customQuestion: zod_1.z.string().max(500).optional().nullable(),
    cardContext: exports.AvoCardContextSchema,
    responseLanguage: exports.AvoLanguageSchema,
})
    .strict();
exports.AvoQueryResponseSchema = zod_1.z.object({
    answer: zod_1.z.string(),
    remainingToday: zod_1.z.number().min(0),
    isLimitReached: zod_1.z.boolean(),
});
// ===========================
// getAvoQueryLimit response
// ===========================
exports.GetAvoQueryLimitResponseSchema = zod_1.z.object({
    usedToday: zod_1.z.number().min(0),
    remainingToday: zod_1.z.number().min(0),
    dailyLimit: zod_1.z.number().min(0),
    isLimitReached: zod_1.z.boolean(),
});
