import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Pola edytowalne talii (formularz)
 */
export const DeckCoreSchema = z
  .object({
    title: z.string().min(1),
    category: z.string().nullable().optional(),
    icon: z.string().default("cards"),
    tags: z.array(z.string()).default([]),
    isPublic: z.boolean(),
    frontLanguage: z.string().nullable().optional(),
    backLanguage: z.string().nullable().optional(),
  })
  .strict();

export type DeckCore = z.infer<typeof DeckCoreSchema>;

/**
 * Timestampy talii
 */
export const DeckTimestampSchema = z
  .object({
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export type DeckTimestamp = z.infer<typeof DeckTimestampSchema>;

/**
 * Dane meta talii (systemowe)
 */
export const DeckMetaSchema = z
  .object({
    id: z.string(),
    views: z.number().min(0).default(0),
    likes: z.number().min(0).default(0),
    cardsNum: z.number().min(0),
    createdBy: z.string(),
    is_deleted: z.boolean().default(false),
    deletedAt: TimestampSchema.optional(),
    title_lower: z.string().optional(),
    editors: z.array(z.string()).default([]),
  })
  .strict();

export type DeckMeta = z.infer<typeof DeckMetaSchema>;

/**
 * Dane talii podczas tworzenia (backend)
 */
export const DeckSchema = DeckCoreSchema.merge(DeckMetaSchema)
  .merge(DeckTimestampSchema)
  .strict();

export type Deck = z.infer<typeof DeckSchema>;

////////////////////////////////////////////////////////////
// Deck Learning Data
////////////////////////////////////////////////////////////

/**
 * Learning mode for a deck
 */
export const LearningModeSchema = z.enum(["srs", "all_in_one"]);
export type LearningMode = z.infer<typeof LearningModeSchema>;

/**
 * Ustawienia talii kart
 */
export const DeckSettingsSchema = z
  .object({
    dueCardsNumPerDay: z.number().min(0).optional(),
    newCardsNumPerDay: z.number().min(0).optional(),
    zenMode: z.boolean().default(false),
    shuffleNewCards: z.boolean().default(false),
    learningMode: LearningModeSchema.optional(), // undefined = never selected
    bidirectional: z.boolean().default(false),
  })
  .strict();

export type DeckSettings = z.infer<typeof DeckSettingsSchema>;

/**
 * Statystyki dzienne dla talii
 */
export const DailyStatsSchema = z
  .object({
    newCardsRemaining: z.number().min(0),
    dueCardsRemaining: z.number().min(0),
    inProgressDueCards: z.number().min(0),
    inProgressNewCards: z.number().min(0),
    completedNewToday: z.number().min(0),
    completedDueToday: z.number().min(0),
    lastUpdatedStats: TimestampSchema,
  })
  .strict();

export type DailyStats = z.infer<typeof DailyStatsSchema>;

/**
 * Talia do nauki (users/{userId}/decks/{deckId})
 */
export const DeckLearningCoreSchema = z
  .object({
    title: z.string(),
    settings: DeckSettingsSchema,
  })
  .strict();

export type DeckLearningCore = z.infer<typeof DeckLearningCoreSchema>;

export const DeckLearningTimestampSchema = z
  .object({
    lastReviewDate: TimestampSchema.optional(),
    updatedAt: TimestampSchema,
  })
  .strict();

export type DeckLearningTimestamp = z.infer<typeof DeckLearningTimestampSchema>;

export const DeckLearningMetaSchema = z
  .object({
    id: z.string(),
    cardsNum: z.number().min(0),
    category: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    isPublic: z.boolean().nullable().optional(),
    frontLanguage: z.string().nullable().optional(),
    backLanguage: z.string().nullable().optional(),
    title_lower: z.string().nullable().optional(),
  })
  .strict();

export type DeckLearningMeta = z.infer<typeof DeckLearningMetaSchema>;

export const DeckLearningDataSchema = DeckLearningMetaSchema.merge(
  DeckLearningCoreSchema
)
  .merge(DeckLearningTimestampSchema)
  .extend({
    dailyStats: DailyStatsSchema.optional().nullable(),
  })
  .strict();

export type DeckLearningData = z.infer<typeof DeckLearningDataSchema>;

////////////////////////////////////////////////////////////
// Partial schematy dla update'ów (częściowe aktualizacje)
////////////////////////////////////////////////////////////

/**
 * Częściowa aktualizacja pól edytowalnych talii
 * Wszystkie pola są opcjonalne, ale muszą mieć poprawny typ jeśli są podane
 */
export const DeckCoreUpdateSchema = DeckCoreSchema.partial().strict();

export type DeckCoreUpdate = z.infer<typeof DeckCoreUpdateSchema>;

/**
 * Częściowa aktualizacja ustawień talii
 */
export const DeckSettingsUpdateSchema = DeckSettingsSchema.partial().strict();

export type DeckSettingsUpdate = z.infer<typeof DeckSettingsUpdateSchema>;

/**
 * Częściowa aktualizacja danych talii (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdBy, views, etc.
 */
export const DeckUpdateSchema = DeckCoreUpdateSchema.extend({
  updatedAt: TimestampSchema.optional(),
}).strict();

export type DeckUpdate = z.infer<typeof DeckUpdateSchema>;

/**
 * Częściowa aktualizacja danych nauki talii
 */
export const DeckLearningDataUpdateSchema = DeckLearningCoreSchema.partial()
  .extend({
    lastReviewDate: TimestampSchema.optional(),
    dailyStats: DailyStatsSchema.optional().nullable(),
  })
  .strict();

export type DeckLearningDataUpdate = z.infer<
  typeof DeckLearningDataUpdateSchema
>;

////////////////////////////////////////////////////////////
// Views and Likes
////////////////////////////////////////////////////////////

/**
 * Viewer document (decks/{deckId}/viewers/{userId})
 */
export const DeckViewerSchema = z
  .object({
    viewedAt: TimestampSchema,
  })
  .strict();

export type DeckViewer = z.infer<typeof DeckViewerSchema>;

/**
 * Liked deck document (users/{userId}/likedDecks/{deckId})
 */
export const LikedDeckSchema = z
  .object({
    likedAt: TimestampSchema,
    deckId: z.string(),
  })
  .strict();

export type LikedDeck = z.infer<typeof LikedDeckSchema>;
