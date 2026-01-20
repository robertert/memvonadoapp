"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndoCardResponseSchema = exports.WeeklyRollOverResponseSchema = exports.SubmitPointsResponseSchema = exports.GetCurrentSeasonResponseSchema = exports.ServerNowSchema = exports.GetUserAwardsResponseSchema = exports.GetUserActivityHeatmapResponseSchema = exports.GetUserProfileResponseSchema = exports.GetUserSettingsResponseSchema = exports.GetUserProgressResponseSchema = exports.UpdateUserStreakOnLoginResponseSchema = exports.UpdateUserStreakIfQualifiedResponseSchema = exports.UpdateUserSettingsRequestSchema = exports.SubmitPointsRequestSchema = exports.GetUserAwardsRequestSchema = exports.GetUserActivityHeatmapRequestSchema = exports.GetUserProfileRequestSchema = exports.GetUserSettingsRequestSchema = exports.UndoCardRequestSchema = exports.GetUserProgressRequestSchema = exports.UpdateCardProgressRequestSchema = exports.GetUserDecksRequestSchema = exports.UpdateUserStreakOnLoginRequestSchema = exports.UpdateUserStreakIfQualifiedRequestSchema = void 0;
const zod_1 = require("zod");
const index_1 = require("../index");
const base_1 = require("../base");
const card_1 = require("../card");
// ============================================================================
// User – request schemas
// ============================================================================
exports.UpdateUserStreakIfQualifiedRequestSchema = zod_1.z.object({}).strict();
exports.UpdateUserStreakOnLoginRequestSchema = zod_1.z
    .object({})
    .strict();
exports.GetUserDecksRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.UpdateCardProgressRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    deckId: zod_1.z.string(),
    card: card_1.CardSchema,
    // scheduledTime w ms (client time, offset od „teraz”)
    scheduledTime: zod_1.z.number().int(),
    dailyStats: index_1.DailyStatsSchema.optional(),
})
    .strict();
exports.GetUserProgressRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.UndoCardRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    card: card_1.CardSchema,
    dailyStats: index_1.DailyStatsSchema,
})
    .strict();
exports.GetUserSettingsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.GetUserProfileRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.GetUserActivityHeatmapRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    weeks: zod_1.z.number().int().positive().optional(),
})
    .strict();
exports.GetUserAwardsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.SubmitPointsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    delta: zod_1.z.number().int(),
})
    .strict();
exports.UpdateUserSettingsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    settings: index_1.UserSettingsSchema,
})
    .strict();
// ============================================================================
// User – response schemas
// ============================================================================
exports.UpdateUserStreakIfQualifiedResponseSchema = zod_1.z.object({
    qualified: zod_1.z.boolean(),
    currentStreak: zod_1.z.number(),
    longestStreak: zod_1.z.number(),
    lastStreakDate: zod_1.z.string().nullable(),
    threshold: zod_1.z.number(),
    todayCount: zod_1.z.number().nullish(),
    updated: zod_1.z.boolean(),
});
exports.UpdateUserStreakOnLoginResponseSchema = zod_1.z.object({
    currentStreak: zod_1.z.number(),
    longestStreak: zod_1.z.number().optional(),
    previousStreak: zod_1.z.number().optional(),
    lastStreakDate: zod_1.z.string().optional(),
    updated: zod_1.z.boolean(),
    status: zod_1.z.enum(["streak_safe", "streak_reset"]),
});
exports.GetUserProgressResponseSchema = zod_1.z.object({
    userProgress: index_1.UserProgressSchema,
});
exports.GetUserSettingsResponseSchema = zod_1.z.object({
    settings: index_1.UserSettingsSchema,
});
exports.GetUserProfileResponseSchema = index_1.UserSchema;
exports.GetUserActivityHeatmapResponseSchema = zod_1.z.object({
    heatmapData: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string(),
        count: zod_1.z.number(),
    })),
});
exports.GetUserAwardsResponseSchema = zod_1.z.object({
    awards: zod_1.z.array(zod_1.z.any()),
});
// ============================================================================
// Season / time helpers
// ============================================================================
exports.ServerNowSchema = zod_1.z.object({
    nowMs: zod_1.z.number(),
    iso: zod_1.z.string(),
});
exports.GetCurrentSeasonResponseSchema = zod_1.z.object({
    seasonId: zod_1.z.string(),
    startAt: base_1.TimestampSchema,
    endAt: base_1.TimestampSchema,
    status: zod_1.z.string(),
});
// ============================================================================
// Season helpers – mutation endpoints
// ============================================================================
exports.SubmitPointsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.WeeklyRollOverResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    nextSeasonId: zod_1.z.string(),
});
exports.UndoCardResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
