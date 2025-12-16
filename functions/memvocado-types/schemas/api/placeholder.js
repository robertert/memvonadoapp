"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPlaceholderDataResponseSchema = exports.AddPlaceholderDataRequestSchema = void 0;
const zod_1 = require("zod");
exports.AddPlaceholderDataRequestSchema = zod_1.z
    .object({
    userId: zod_1.z.string().optional(),
    createUser: zod_1.z.boolean().optional(),
})
    .strict();
exports.AddPlaceholderDataResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    userId: zod_1.z.string(),
    decksCreated: zod_1.z.number(),
    totalCards: zod_1.z.number(),
    deckIds: zod_1.z.array(zod_1.z.string()),
});
