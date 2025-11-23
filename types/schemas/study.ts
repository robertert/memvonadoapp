import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Sesja nauki
 */
export const StudySessionCreateSchema = z
  .object({
    deckId: z.string(),
    cardId: z.string().optional(),
    grade: z.number().min(0).max(5).optional(),
    reviewTime: TimestampSchema,
  })
  .strict();

export type StudySessionCreate = z.infer<typeof StudySessionCreateSchema>;

export const StudySessionSchema = StudySessionCreateSchema.extend({
  id: z.string(),
});

export type StudySession = z.infer<typeof StudySessionSchema>;
