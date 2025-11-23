"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSchema = exports.NotificationCreateSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Powiadomienie
 */
exports.NotificationCreateSchema = zod_1.z
    .object({
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    type: zod_1.z.enum(["info", "success", "warning", "error"]),
    linkTo: zod_1.z.string().optional(),
    read: zod_1.z.boolean().default(false),
    createdAt: base_1.TimestampSchema,
    readAt: base_1.TimestampSchema.optional(),
})
    .strict();
exports.NotificationSchema = exports.NotificationCreateSchema.extend({
    id: zod_1.z.string(),
});
