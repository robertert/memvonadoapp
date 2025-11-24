import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Pola edytowalne talii (formularz)
 */
export const DeckCoreSchema = z
  .object({
    title: z.string(),
    category: z.string(),
    icon: z.string().default("cards"),
    tags: z.array(z.string()).default([]),
    isPublic: z.boolean(),
    updatedAt: TimestampSchema.optional(),
  })
  .strict();

export type DeckCore = z.infer<typeof DeckCoreSchema>;

/**
 * Timestampy talii
 */
export const DeckTimestampSchema = z
  .object({
    createdAt: TimestampSchema,
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
 * Ustawienia talii kart
 */
export const DeckSettingsSchema = z
  .object({
    dueCardsNumPerDay: z.number().min(0).optional(),
    newCardsNumPerDay: z.number().min(0).optional(),
    zenMode: z.boolean().default(false),
  })
  .strict();

export type DeckSettings = z.infer<typeof DeckSettingsSchema>;

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
    updatedAt: TimestampSchema.optional(),
  })
  .strict();

export type DeckLearningTimestamp = z.infer<typeof DeckLearningTimestampSchema>;

export const DeckLearningMetaSchema = z
  .object({
    id: z.string(),
    cardsNum: z.number().min(0),
  })
  .strict();

export type DeckLearningMeta = z.infer<typeof DeckLearningMetaSchema>;

export const DeckLearningDataSchema = DeckLearningMetaSchema.merge(
  DeckLearningCoreSchema
)
  .merge(DeckLearningTimestampSchema)
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
  })
  .strict();

export type DeckLearningDataUpdate = z.infer<
  typeof DeckLearningDataUpdateSchema
>;
