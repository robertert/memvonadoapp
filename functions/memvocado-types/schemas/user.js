"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowersArraySchema = exports.FollowersSchema = exports.FollowingArraySchema = exports.FollowingSchema = exports.UserSchema = exports.UserMetaSchema = exports.UserDailyStatsSchema = exports.UserTimestampSchema = exports.UserCoreSchema = exports.UserSettingsSchema = exports.UserStatsSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
const avocado_1 = require("./avocado");
/**
 * Statystyki użytkownika
 */
exports.UserStatsSchema = zod_1.z.object({
    totalCards: zod_1.z.number().min(0).default(0),
    totalDecks: zod_1.z.number().min(0).default(0),
    totalReviews: zod_1.z.number().min(0).default(0),
    averageDifficulty: zod_1.z.number().min(0).max(5).optional(),
    currentStreak: zod_1.z.number().min(0).default(0),
    longestStreak: zod_1.z.number().min(0).default(0),
    lastStreakDate: base_1.TimestampSchema.optional(),
    lastStudyDate: base_1.TimestampSchema.optional(),
});
/**
 * Ustawienia użytkownika
 */
exports.UserSettingsSchema = zod_1.z
    .object({
    theme: zod_1.z.enum(["light", "dark"]).default("light"),
    notificationsEnabled: zod_1.z.boolean().default(true),
    dailyGoal: zod_1.z.number().min(0).default(120),
    dailyNew: zod_1.z.number().min(0).optional(),
    language: zod_1.z.string().default("en"),
    timeZone: zod_1.z.string().default("UTC"),
})
    .strict();
/**
 * Użytkownik - core fields
 */
exports.UserCoreSchema = zod_1.z
    .object({
    username: zod_1.z.string(),
    email: zod_1.z.string().email(),
    settings: exports.UserSettingsSchema,
})
    .strict();
exports.UserTimestampSchema = zod_1.z.object({
    createdAt: base_1.TimestampSchema,
    updatedAt: base_1.TimestampSchema,
});
exports.UserDailyStatsSchema = zod_1.z.object({
    completedNewToday: zod_1.z.number().min(0),
    completedDueToday: zod_1.z.number().min(0),
    lastUpdatedStats: base_1.TimestampSchema,
});
exports.UserMetaSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    league: zod_1.z.number().min(1).max(15).default(1),
    currentGroupId: zod_1.z.string().nullable(),
    experiencePoints: zod_1.z.number().min(0).default(0),
    currencyCount: zod_1.z.number().min(0).default(0),
    stats: exports.UserStatsSchema,
    avocadoGrowth: avocado_1.AvocadoGrowthSchema.optional().nullable(),
    dailyStats: exports.UserDailyStatsSchema.optional().nullable(),
    followingCount: zod_1.z.number().min(0).default(0),
    followersCount: zod_1.z.number().min(0).default(0),
    profileCompleted: zod_1.z.boolean().default(false).optional(),
    interests: zod_1.z.array(zod_1.z.string()).default([]),
})
    .strict();
exports.UserSchema = exports.UserCoreSchema.merge(exports.UserMetaSchema)
    .merge(exports.UserTimestampSchema)
    .strict();
exports.FollowingSchema = zod_1.z.object({
    userId: zod_1.z.string(),
});
exports.FollowingArraySchema = zod_1.z.array(exports.FollowingSchema);
exports.FollowersSchema = zod_1.z.object({
    userId: zod_1.z.string(),
});
exports.FollowersArraySchema = zod_1.z.array(exports.FollowersSchema);
