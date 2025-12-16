"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignUserToGroupResponseSchema = exports.GetFollowingRankingsResponseSchema = exports.GetUserRankingResponseSchema = exports.GetLeaderboardResponseSchema = exports.AssignUserToGroupRequestSchema = exports.GetFollowingRankingsRequestSchema = exports.GetUserRankingRequestSchema = exports.GetLeaderboardRequestSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("../base");
// ===========================
// Ranking request schemas
// ===========================
exports.GetLeaderboardRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    seasonId: zod_1.z.string().optional(),
})
    .strict();
exports.GetUserRankingRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    seasonId: zod_1.z.string().optional(),
})
    .strict();
exports.GetFollowingRankingsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    seasonId: zod_1.z.string().optional(),
})
    .strict();
exports.AssignUserToGroupRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    leagueNumber: zod_1.z.number().int().min(1).max(15),
    seasonId: zod_1.z.string(),
})
    .strict();
// ===========================
// Ranking response schemas
// ===========================
exports.GetLeaderboardResponseSchema = zod_1.z.object({
    entries: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        username: zod_1.z.string(),
        points: zod_1.z.number(),
        position: zod_1.z.number(),
        lastActivityAt: base_1.TimestampSchema.nullable(),
    })),
    groupId: zod_1.z.string().nullable(),
    leagueNumber: zod_1.z.number().nullable(),
    seasonId: zod_1.z.string(),
    totalMembers: zod_1.z.number(),
});
exports.GetUserRankingResponseSchema = zod_1.z.object({
    position: zod_1.z.number().nullable(),
    groupId: zod_1.z.string().nullable(),
    leagueNumber: zod_1.z.number().nullable(),
    points: zod_1.z.number(),
    totalMembers: zod_1.z.number().nullable(),
});
exports.GetFollowingRankingsResponseSchema = zod_1.z.object({
    rankings: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        username: zod_1.z.string().optional(),
        position: zod_1.z.number().nullable(),
        points: zod_1.z.number(),
        leagueNumber: zod_1.z.number(),
        groupId: zod_1.z.string().optional(),
        totalMembers: zod_1.z.number().optional(),
    })),
});
exports.AssignUserToGroupResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    groupId: zod_1.z.string(),
});
