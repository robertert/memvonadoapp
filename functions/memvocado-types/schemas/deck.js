"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeckLearningDataUpdateSchema = exports.DeckUpdateSchema = exports.DeckSettingsUpdateSchema = exports.DeckCoreUpdateSchema = exports.DeckLearningDataSchema = exports.DeckLearningMetaSchema = exports.DeckLearningTimestampSchema = exports.DeckLearningCoreSchema = exports.DailyStatsSchema = exports.DeckSettingsSchema = exports.DeckSchema = exports.DeckMetaSchema = exports.DeckTimestampSchema = exports.DeckCoreSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Pola edytowalne talii (formularz)
 */
exports.DeckCoreSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1),
    category: zod_1.z.string().nullable().optional(),
    icon: zod_1.z.string().default("cards"),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    isPublic: zod_1.z.boolean(),
    frontLanguage: zod_1.z.string().nullable().optional(),
    backLanguage: zod_1.z.string().nullable().optional(),
})
    .strict();
/**
 * Timestampy talii
 */
exports.DeckTimestampSchema = zod_1.z
    .object({
    createdAt: base_1.TimestampSchema,
    updatedAt: base_1.TimestampSchema,
})
    .strict();
/**
 * Dane meta talii (systemowe)
 */
exports.DeckMetaSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    views: zod_1.z.number().min(0).default(0),
    likes: zod_1.z.number().min(0).default(0),
    cardsNum: zod_1.z.number().min(0),
    createdBy: zod_1.z.string(),
    is_deleted: zod_1.z.boolean().default(false),
    deletedAt: base_1.TimestampSchema.optional(),
})
    .strict();
/**
 * Dane talii podczas tworzenia (backend)
 */
exports.DeckSchema = exports.DeckCoreSchema.merge(exports.DeckMetaSchema)
    .merge(exports.DeckTimestampSchema)
    .strict();
////////////////////////////////////////////////////////////
// Deck Learning Data
////////////////////////////////////////////////////////////
/**
 * Ustawienia talii kart
 */
exports.DeckSettingsSchema = zod_1.z
    .object({
    dueCardsNumPerDay: zod_1.z.number().min(0).optional(),
    newCardsNumPerDay: zod_1.z.number().min(0).optional(),
    zenMode: zod_1.z.boolean().default(false),
    shuffleNewCards: zod_1.z.boolean().default(false),
})
    .strict();
/**
 * Statystyki dzienne dla talii
 */
exports.DailyStatsSchema = zod_1.z
    .object({
    newCardsRemaining: zod_1.z.number().min(0),
    dueCardsRemaining: zod_1.z.number().min(0),
    inProgressDueCards: zod_1.z.number().min(0),
    inProgressNewCards: zod_1.z.number().min(0),
    completedToday: zod_1.z.number().min(0),
    lastUpdatedStats: base_1.TimestampSchema,
})
    .strict();
/**
 * Talia do nauki (users/{userId}/decks/{deckId})
 */
exports.DeckLearningCoreSchema = zod_1.z
    .object({
    title: zod_1.z.string(),
    settings: exports.DeckSettingsSchema,
})
    .strict();
exports.DeckLearningTimestampSchema = zod_1.z
    .object({
    lastReviewDate: base_1.TimestampSchema.optional(),
    updatedAt: base_1.TimestampSchema,
})
    .strict();
exports.DeckLearningMetaSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    cardsNum: zod_1.z.number().min(0),
    category: zod_1.z.string().nullable().optional(),
    icon: zod_1.z.string().nullable().optional(),
    tags: zod_1.z.array(zod_1.z.string()).nullable().optional(),
    isPublic: zod_1.z.boolean().nullable().optional(),
})
    .strict();
exports.DeckLearningDataSchema = exports.DeckLearningMetaSchema.merge(exports.DeckLearningCoreSchema)
    .merge(exports.DeckLearningTimestampSchema)
    .extend({
    dailyStats: exports.DailyStatsSchema.optional().nullable(),
})
    .strict();
////////////////////////////////////////////////////////////
// Partial schematy dla update'ów (częściowe aktualizacje)
////////////////////////////////////////////////////////////
/**
 * Częściowa aktualizacja pól edytowalnych talii
 * Wszystkie pola są opcjonalne, ale muszą mieć poprawny typ jeśli są podane
 */
exports.DeckCoreUpdateSchema = exports.DeckCoreSchema.partial().strict();
/**
 * Częściowa aktualizacja ustawień talii
 */
exports.DeckSettingsUpdateSchema = exports.DeckSettingsSchema.partial().strict();
/**
 * Częściowa aktualizacja danych talii (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdBy, views, etc.
 */
exports.DeckUpdateSchema = exports.DeckCoreUpdateSchema.extend({
    updatedAt: base_1.TimestampSchema.optional(),
}).strict();
/**
 * Częściowa aktualizacja danych nauki talii
 */
exports.DeckLearningDataUpdateSchema = exports.DeckLearningCoreSchema.partial()
    .extend({
    lastReviewDate: base_1.TimestampSchema.optional(),
    dailyStats: exports.DailyStatsSchema.optional().nullable(),
})
    .strict();
