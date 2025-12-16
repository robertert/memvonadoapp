"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifySeasonEndResponseSchema = exports.NotifyStreakBrokenResponseSchema = exports.CreateNotificationResponseSchema = exports.MarkNotificationReadResponseSchema = exports.GetNotificationsResponseSchema = exports.NotifySeasonEndRequestSchema = exports.NotifyStreakBrokenRequestSchema = exports.CreateNotificationRequestSchema = exports.MarkNotificationReadRequestSchema = exports.GetNotificationsRequestSchema = void 0;
const zod_1 = require("zod");
const index_1 = require("../index");
// ===========================
// Notification request schemas
// ===========================
exports.GetNotificationsRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    limit: zod_1.z.number().int().min(1).max(200).optional(),
})
    .strict();
exports.MarkNotificationReadRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    notificationId: zod_1.z.string(),
})
    .strict();
exports.CreateNotificationRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    notification: index_1.NotificationSchema.omit({
        createdAt: true,
        readAt: true,
        id: true,
    }),
})
    .strict();
exports.NotifyStreakBrokenRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
})
    .strict();
exports.NotifySeasonEndRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string(),
    seasonId: zod_1.z.string(),
    finalPosition: zod_1.z.number().int().optional(),
    leagueNumber: zod_1.z.number().int().optional(),
})
    .strict();
// ===========================
// Notification response schemas
// ===========================
exports.GetNotificationsResponseSchema = zod_1.z.object({
    notifications: zod_1.z.array(index_1.NotificationSchema),
});
exports.MarkNotificationReadResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.CreateNotificationResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    notificationId: zod_1.z.string(),
});
exports.NotifyStreakBrokenResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.NotifySeasonEndResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
