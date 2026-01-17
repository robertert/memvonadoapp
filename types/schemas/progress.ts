import { z } from "zod";

import { UserStatsSchema } from "./user";

/**
 * Postęp użytkownika
 */
export const UserProgressSchema = z
  .object({
    stats: UserStatsSchema,
    dailyGoal: z.number().min(0).default(120),
    recentSessions: z.array(z.any()).default([]),
  })
  .strict();

export type UserProgress = z.infer<typeof UserProgressSchema>;
