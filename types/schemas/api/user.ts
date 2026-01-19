import { z } from "zod";

import {
  UserProgressSchema,
  UserSettingsSchema,
  UserSchema,
  DailyStatsSchema,
} from "../index";
import { TimestampSchema } from "../base";
import { CardSchema } from "../card";

// ============================================================================
// User – request schemas
// ============================================================================

export const UpdateUserStreakIfQualifiedRequestSchema = z.object({}).strict();

export type UpdateUserStreakIfQualifiedRequest = z.infer<
  typeof UpdateUserStreakIfQualifiedRequestSchema
>;

export const UpdateUserStreakOnLoginRequestSchema = z
  .object({})
  .strict();

export type UpdateUserStreakOnLoginRequest = z.infer<
  typeof UpdateUserStreakOnLoginRequestSchema
>;

export const GetUserDecksRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();

export type GetUserDecksRequest = z.infer<typeof GetUserDecksRequestSchema>;

export const UpdateCardProgressRequestSchema = z
  .object({
    userId: z.string(),
    deckId: z.string(),
    card: CardSchema,
    // scheduledTime w ms (client time, offset od „teraz”)
    scheduledTime: z.number().int(),
    dailyStats: DailyStatsSchema.optional(),
  })
  .strict();

export type UpdateCardProgressRequest = z.infer<
  typeof UpdateCardProgressRequestSchema
>;

export const GetUserProgressRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();

export type GetUserProgressRequest = z.infer<
  typeof GetUserProgressRequestSchema
>;

export const UndoCardRequestSchema = z
  .object({
    deckId: z.string(),
    card: CardSchema,
    dailyStats: DailyStatsSchema,
  })
  .strict();
export type UndoCardRequest = z.infer<typeof UndoCardRequestSchema>;

export const GetUserSettingsRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();

export type GetUserSettingsRequest = z.infer<
  typeof GetUserSettingsRequestSchema
>;

export const GetUserProfileRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();

export type GetUserProfileRequest = z.infer<typeof GetUserProfileRequestSchema>;

export const GetUserActivityHeatmapRequestSchema = z
  .object({
    userId: z.string(),
    weeks: z.number().int().positive().optional(),
  })
  .strict();

export type GetUserActivityHeatmapRequest = z.infer<
  typeof GetUserActivityHeatmapRequestSchema
>;

export const GetUserAwardsRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();

export type GetUserAwardsRequest = z.infer<typeof GetUserAwardsRequestSchema>;

export const SubmitPointsRequestSchema = z
  .object({
    userId: z.string(),
    delta: z.number().int(),
  })
  .strict();

export type SubmitPointsRequest = z.infer<typeof SubmitPointsRequestSchema>;

export const UpdateUserSettingsRequestSchema = z
  .object({
    userId: z.string(),
    settings: UserSettingsSchema,
  })
  .strict();

export type UpdateUserSettingsRequest = z.infer<
  typeof UpdateUserSettingsRequestSchema
>;

// ============================================================================
// User – response schemas
// ============================================================================

export const UpdateUserStreakIfQualifiedResponseSchema = z.object({
  qualified: z.boolean(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastStreakDate: z.string().nullable(),
  threshold: z.number(),
  todayCount: z.number().nullish(),
  updated: z.boolean(),
});

export type UpdateUserStreakIfQualifiedResponse = z.infer<
  typeof UpdateUserStreakIfQualifiedResponseSchema
>;

export const UpdateUserStreakOnLoginResponseSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  previousStreak: z.number(),
  lastStreakDate: z.string(),
  updated: z.boolean(),
  status: z.enum(["streak_safe", "streak_reset"]),
});

export type UpdateUserStreakOnLoginResponse = z.infer<
  typeof UpdateUserStreakOnLoginResponseSchema
>;

export const GetUserProgressResponseSchema = z.object({
  userProgress: UserProgressSchema,
});

export type GetUserProgressResponse = z.infer<
  typeof GetUserProgressResponseSchema
>;

export const GetUserSettingsResponseSchema = z.object({
  settings: UserSettingsSchema,
});

export type GetUserSettingsResponse = z.infer<
  typeof GetUserSettingsResponseSchema
>;

export const GetUserProfileResponseSchema = UserSchema;

export type GetUserProfileResponse = z.infer<
  typeof GetUserProfileResponseSchema
>;

export const GetUserActivityHeatmapResponseSchema = z.object({
  heatmapData: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
});

export type GetUserActivityHeatmapResponse = z.infer<
  typeof GetUserActivityHeatmapResponseSchema
>;

export const GetUserAwardsResponseSchema = z.object({
  awards: z.array(z.any()),
});

export type GetUserAwardsResponse = z.infer<typeof GetUserAwardsResponseSchema>;

// ============================================================================
// Season / time helpers
// ============================================================================

export const ServerNowSchema = z.object({
  nowMs: z.number(),
  iso: z.string(),
});

export type ServerNow = z.infer<typeof ServerNowSchema>;

export const GetCurrentSeasonResponseSchema = z.object({
  seasonId: z.string(),
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  status: z.string(),
});

export type GetCurrentSeasonResponse = z.infer<
  typeof GetCurrentSeasonResponseSchema
>;

// ============================================================================
// Season helpers – mutation endpoints
// ============================================================================

export const SubmitPointsResponseSchema = z.object({
  success: z.boolean(),
});

export type SubmitPointsResponse = z.infer<typeof SubmitPointsResponseSchema>;

export const WeeklyRollOverResponseSchema = z.object({
  success: z.boolean(),
  nextSeasonId: z.string(),
});

export type WeeklyRollOverResponse = z.infer<
  typeof WeeklyRollOverResponseSchema
>;

export const UndoCardResponseSchema = z.object({
  success: z.boolean(),
});
export type UndoCardResponse = z.infer<typeof UndoCardResponseSchema>;
