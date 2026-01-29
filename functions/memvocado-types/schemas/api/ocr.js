"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractTextFromImageResponseSchema = exports.ExtractTextFromImageRequestSchema = void 0;
const zod_1 = require("zod");
// ===========================
// OCR Text Extraction schemas
// ===========================
exports.ExtractTextFromImageRequestSchema = zod_1.z
    .object({
    // Storage path to the cropped image (gs:// or relative path)
    storagePath: zod_1.z.string().min(1),
    // MIME type of the image
    mimeType: zod_1.z.string().default("image/jpeg"),
})
    .strict();
exports.ExtractTextFromImageResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    text: zod_1.z.string().nullable(),
    error: zod_1.z.string().nullable(),
});
