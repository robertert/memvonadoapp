"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProgressSchema = void 0;
const zod_1 = require("zod");
const user_1 = require("./user");
/**
 * Postęp użytkownika
 */
exports.UserProgressSchema = zod_1.z
    .object({
    stats: user_1.UserStatsSchema,
    dailyGoal: zod_1.z.number().min(0).default(120),
    recentSessions: zod_1.z.array(zod_1.z.any()).default([]),
})
    .strict();
