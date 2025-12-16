"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserGroupResponseSchema = exports.GetAllLeaguesInfoResponseSchema = exports.GetLeagueInfoResponseSchema = exports.UpdateUserLeagueRequestSchema = exports.GetUserGroupRequestSchema = exports.GetLeagueInfoRequestSchema = void 0;
const zod_1 = require("zod");
// ===========================
// League request schemas
// ===========================
exports.GetLeagueInfoRequestSchema = zod_1.z
    .object({
    leagueNumber: zod_1.z.number().int().min(1).max(15),
})
    .strict();
exports.GetUserGroupRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    seasonId: zod_1.z.string().optional(),
})
    .strict();
exports.UpdateUserLeagueRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    newLeague: zod_1.z.number().int().min(1).max(15),
    seasonId: zod_1.z.string().optional(),
})
    .strict();
// ===========================
// League response schemas
// ===========================
exports.GetLeagueInfoResponseSchema = zod_1.z.object({
    league: zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        color: zod_1.z.string(),
        description: zod_1.z.string(),
    }),
});
exports.GetAllLeaguesInfoResponseSchema = zod_1.z.object({
    leagues: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.number(),
        name: zod_1.z.string(),
        color: zod_1.z.string(),
        description: zod_1.z.string(),
    })),
});
exports.GetUserGroupResponseSchema = zod_1.z.object({
    groupId: zod_1.z.string().nullable(),
    leagueNumber: zod_1.z.number().nullable(),
    memberCount: zod_1.z.number(),
    capacity: zod_1.z.number(),
    isFull: zod_1.z.boolean(),
});
