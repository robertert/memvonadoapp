"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanDocumentResponseSchema = exports.ScanDocumentRequestSchema = void 0;
const zod_1 = require("zod");
exports.ScanDocumentRequestSchema = zod_1.z
    .object({
    storagePath: zod_1.z.string(),
    mimeType: zod_1.z.string(),
})
    .strict();
exports.ScanDocumentResponseSchema = zod_1.z.object({
    flashcards: zod_1.z.array(zod_1.z.object({
        front: zod_1.z.string(),
        back: zod_1.z.string(),
    })),
});
