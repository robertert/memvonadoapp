"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessFileResponseSchema = exports.ProcessFileMetaSchema = exports.ProcessFileFlashcardSchema = exports.ProcessFileRequestSchema = void 0;
const zod_1 = require("zod");
// ===========================
// Process File schemas
// ===========================
exports.ProcessFileRequestSchema = zod_1.z
    .object({
    storagePath: zod_1.z.string().min(1),
    mimeType: zod_1.z.string().min(1),
    hint: zod_1.z.string().optional().nullable(),
    fileName: zod_1.z.string().optional(),
    detail: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
})
    .strict();
exports.ProcessFileFlashcardSchema = zod_1.z.object({
    front: zod_1.z.string(),
    back: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ProcessFileMetaSchema = zod_1.z.object({
    detected_topic: zod_1.z.string(),
    detected_mode: zod_1.z.enum(["vocabulary", "exam_qa", "concept"]),
    source_type: zod_1.z.string(),
});
exports.ProcessFileResponseSchema = zod_1.z.object({
    meta: exports.ProcessFileMetaSchema,
    flashcards: zod_1.z.array(exports.ProcessFileFlashcardSchema),
});
