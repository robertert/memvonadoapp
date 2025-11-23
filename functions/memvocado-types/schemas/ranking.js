"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueGroupMemberSchema = exports.LeagueGroupSchema = exports.SeasonUserPointsSchema = exports.SeasonSchema = exports.SeasonCreateSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Sezon rankingowy
 */
exports.SeasonCreateSchema = zod_1.z
    .object({
    seasonId: zod_1.z.string(),
    startAt: base_1.TimestampSchema,
    endAt: base_1.TimestampSchema,
    status: zod_1.z.enum(["active", "inactive"]).default("active"),
})
    .strict();
exports.SeasonSchema = exports.SeasonCreateSchema.extend({
    id: zod_1.z.string(),
});
/**
 * Punkty użytkownika w sezonie
 */
exports.SeasonUserPointsSchema = zod_1.z
    .object({
    points: zod_1.z.number().min(0),
    league: zod_1.z.number().min(1).max(15),
    groupId: zod_1.z.string().optional(),
    lastActivityAt: base_1.TimestampSchema,
})
    .strict();
/**
 * Grupa ligowa
 */
exports.LeagueGroupSchema = zod_1.z
    .object({
    createdAt: base_1.TimestampSchema,
    isFull: zod_1.z.boolean(),
    capacity: zod_1.z.number().min(1).default(20),
    currentCount: zod_1.z.number().min(0),
    id: zod_1.z.string(),
    leagueNumber: zod_1.z.number().min(1).max(15),
})
    .strict();
/**
 * Członek grupy ligowej
 */
exports.LeagueGroupMemberSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    username: zod_1.z.string(),
    points: zod_1.z.number().min(0),
    lastActivityAt: base_1.TimestampSchema,
})
    .strict();
