import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Statystyki użytkownika
 */
export const UserStatsSchema = z
  .object({
    totalCards: z.number().min(0).default(0),
    totalDecks: z.number().min(0).default(0),
    totalReviews: z.number().min(0).default(0),
    averageDifficulty: z.number().min(0).max(5).optional(),
    currentStreak: z.number().min(0).default(0),
    longestStreak: z.number().min(0).default(0),
    lastStreakDate: TimestampSchema.optional(),
    lastStudyDate: TimestampSchema.optional(),
  })
  .strict();

export type UserStats = z.infer<typeof UserStatsSchema>;

/**
 * Ustawienia użytkownika
 */
export const UserSettingsSchema = z
  .object({
    theme: z.enum(["light", "dark"]).default("light"),
    notificationsEnabled: z.boolean().default(true),
    dailyGoal: z.number().min(0),
    dailyNew: z.number().min(0),
    language: z.string().default("en"),
    timeZone: z.string().default("UTC"),
  })
  .strict();

export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Użytkownik - core fields
 */
export const UserCoreSchema = z
  .object({
    username: z.string(),
    email: z.string().email(),
    settings: UserSettingsSchema,
  })
  .strict();

export type UserCore = z.infer<typeof UserCoreSchema>;

export const UserTimestampSchema = z.object({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type UserTimestamp = z.infer<typeof UserTimestampSchema>;

export const UserMetaSchema = z
  .object({
    id: z.string(),
    league: z.number().min(1).max(15).default(1),
    currentGroupId: z.string(),
    experiencePoints: z.number().min(0).default(0),
    currencyCount: z.number().min(0).default(0),
    stats: UserStatsSchema,
    followingCount: z.number().min(0).default(0),
    followersCount: z.number().min(0).default(0),
    profileCompleted: z.boolean().default(false).optional(),
    interests: z.array(z.string()).default([]),
  })
  .strict();

export type UserMeta = z.infer<typeof UserMetaSchema>;

export const UserSchema = UserCoreSchema.merge(UserMetaSchema)
  .merge(UserTimestampSchema)
  .strict();

export type User = z.infer<typeof UserSchema>;

export const FollowingSchema = z.object({
  userId: z.string(),
});

export const FollowingArraySchema = z.array(FollowingSchema);

export type Following = z.infer<typeof FollowingSchema>;

export const FollowersSchema = z.object({
  userId: z.string(),
});

export const FollowersArraySchema = z.array(FollowersSchema);

export type Followers = z.infer<typeof FollowersSchema>;
