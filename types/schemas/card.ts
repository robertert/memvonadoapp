import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Reprezentacja numerycznych ocen przechowywanych w bazie.
 * Ułatwia czytanie kodu, jednocześnie zachowując kompatybilność z danymi.
 */
export enum CardGrade {
  /**
   * Karta nie została jeszcze oceniona.
   */
  NotGraded = -1,
  /**
   * Zła odpowiedź.
   */
  Wrong = 0,
  /**
   * Trudna odpowiedź.
   */
  Hard = 1,
  /**
   * Dobra odpowiedź.
   */
  Good = 2,
  /**
   * Łatwa odpowiedź.
   */
  Easy = 3,
}

/**
 * Podstawowe dane karty (edytowalne w formularzu)
 */
export const CardDataSchema = z
  .object({
    front: z.string(),
    back: z.string(),
  })
  .strict();

export type CardData = z.infer<typeof CardDataSchema>;

export const CardCoreSchema = z
  .object({
    cardData: CardDataSchema,
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type CardCore = z.infer<typeof CardCoreSchema>;

/**
 * Algorytm FSRS (Free Spaced Repetition Scheduler)
 */
export const CardAlgoSchema = z
  .object({
    difficulty: z.number(),
    scheduled_days: z.number(),
    due: TimestampSchema,
    last_review: TimestampSchema.optional(),
    reps: z.number().min(0),
    state: z.number(),
    stability: z.number(),
    elapsed_days: z.number(),
    lapses: z.number(),
  })
  .strict();

export type CardAlgo = z.infer<typeof CardAlgoSchema>;

/**
 * First Learning - dane dla pierwszej nauki karty
 */
export const FirstLearnSchema = z
  .object({
    isNew: z.boolean().default(true), // Card never seen
    isFirst: z.boolean().optional(), // Card is in first learning phase
    due: TimestampSchema.optional(),
    consecutiveGood: z.number().min(0).optional(), // Number of consecutive good answers
  })
  .strict();

export type FirstLearn = z.infer<typeof FirstLearnSchema>;

/**
 * Timestampy karty
 */
export const CardTimestampSchema = z
  .object({
    createdAt: TimestampSchema,
  })
  .strict();

export type CardTimestamp = z.infer<typeof CardTimestampSchema>;

/**
 * Dane nauki/oceny karty
 */
export const CardLearningSchema = z
  .object({
    cardAlgo: CardAlgoSchema.optional(),
    firstLearn: FirstLearnSchema,
    grade: z.nativeEnum(CardGrade).optional(), // -1: not graded, 0: wrong, 1: hard, 2: good, 3: easy
    cardAlgoReverse: CardAlgoSchema.optional(),
    firstLearnReverse: FirstLearnSchema.optional(),
  })
  .strict();

export type CardLearning = z.infer<typeof CardLearningSchema>;

/**
 * Meta karty
 */
export const CardMetaSchema = z
  .object({
    id: z.string(),
    hasChanges: z.boolean().optional(),
    updatedAt: TimestampSchema.optional(),
  })
  .strict();

export type CardMeta = z.infer<typeof CardMetaSchema>;

/**
 * Pełna karta
 */
export const CardSchema = CardCoreSchema.merge(CardLearningSchema)
  .merge(CardTimestampSchema)
  .merge(CardMetaSchema);

export type Card = z.infer<typeof CardSchema>;

////////////////////////////////////////////////////////////
// Partial schematy dla update'ów (częściowe aktualizacje)
////////////////////////////////////////////////////////////

/**
 * Częściowa aktualizacja danych karty (tylko cardData)
 */
export const CardDataUpdateSchema = CardDataSchema.partial().strict();

export type CardDataUpdate = z.infer<typeof CardDataUpdateSchema>;

/**
 * Częściowa aktualizacja core karty
 */
export const CardCoreUpdateSchema = CardCoreSchema.partial().strict();

export type CardCoreUpdate = z.infer<typeof CardCoreUpdateSchema>;

/**
 * Częściowa aktualizacja algorytmu karty
 */
export const CardAlgoUpdateSchema = CardAlgoSchema.partial().strict();

export type CardAlgoUpdate = z.infer<typeof CardAlgoUpdateSchema>;

/**
 * Częściowa aktualizacja firstLearn
 */
export const FirstLearnUpdateSchema = FirstLearnSchema.partial().strict();

export type FirstLearnUpdate = z.infer<typeof FirstLearnUpdateSchema>;

/**
 * Częściowa aktualizacja danych nauki karty
 */
export const CardLearningUpdateSchema = CardLearningSchema.partial().strict();

export type CardLearningUpdate = z.infer<typeof CardLearningUpdateSchema>;

/**
 * Częściowa aktualizacja karty (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdAt
 */
export const CardUpdateSchema = CardCoreUpdateSchema.merge(
  CardLearningUpdateSchema
).strict();

export type CardUpdate = z.infer<typeof CardUpdateSchema>;
