"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudySessionSchema = exports.StudySessionCreateSchema = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Sesja nauki
 */
exports.StudySessionCreateSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    cardId: zod_1.z.string().optional(),
    grade: zod_1.z.number().min(-1).max(5).optional(),
    reviewTime: base_1.TimestampSchema,
})
    .strict();
exports.StudySessionSchema = exports.StudySessionCreateSchema.extend({
    id: zod_1.z.string(),
});
