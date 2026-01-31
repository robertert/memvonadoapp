import { z } from "zod";

// Supported languages for AVO responses
export const AVO_SUPPORTED_LANGUAGES = ["pl", "en", "de", "es", "fr"] as const;
export type AvoLanguage = (typeof AVO_SUPPORTED_LANGUAGES)[number];
export const AvoLanguageSchema = z.enum(AVO_SUPPORTED_LANGUAGES);

// Daily query limit per user
export const DAILY_AVO_QUERY_LIMIT = 50;

// Chip types for AVO helper queries
export const AVO_CHIP_TYPES = [
  "explain_answer",
  "mnemonic",
  "use_in_sentence",
  "custom",
] as const;
export type AvoChipType = (typeof AVO_CHIP_TYPES)[number];
export const AvoChipTypeSchema = z.enum(AVO_CHIP_TYPES);

// ===========================
// Card context (sent with each query)
// ===========================

export const AvoCardContextSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string()).default([]),
  deckName: z.string().default(""),
  frontLanguage: z.string().optional(),
  backLanguage: z.string().optional(),
});
export type AvoCardContext = z.infer<typeof AvoCardContextSchema>;

// ===========================
// avoQuery request/response
// ===========================

export const AvoQueryRequestSchema = z
  .object({
    chipType: AvoChipTypeSchema,
    customQuestion: z.string().max(500).optional().nullable(),
    cardContext: AvoCardContextSchema,
    responseLanguage: AvoLanguageSchema,
  })
  .strict();
export type AvoQueryRequest = z.infer<typeof AvoQueryRequestSchema>;

export const AvoQueryResponseSchema = z.object({
  answer: z.string(),
  remainingToday: z.number().min(0),
  isLimitReached: z.boolean(),
});
export type AvoQueryResponse = z.infer<typeof AvoQueryResponseSchema>;

// ===========================
// getAvoQueryLimit response
// ===========================

export const GetAvoQueryLimitResponseSchema = z.object({
  usedToday: z.number().min(0),
  remainingToday: z.number().min(0),
  dailyLimit: z.number().min(0),
  isLimitReached: z.boolean(),
});
export type GetAvoQueryLimitResponse = z.infer<typeof GetAvoQueryLimitResponseSchema>;
