import { z } from "zod";

// ===========================
// OCR Text Extraction schemas
// ===========================

export const ExtractTextFromImageRequestSchema = z
  .object({
    // Storage path to the cropped image (gs:// or relative path)
    storagePath: z.string().min(1),
    // MIME type of the image
    mimeType: z.string().default("image/jpeg"),
  })
  .strict();
export type ExtractTextFromImageRequest = z.infer<typeof ExtractTextFromImageRequestSchema>;

export const ExtractTextFromImageResponseSchema = z.object({
  success: z.boolean(),
  text: z.string().nullable(),
  error: z.string().nullable(),
});
export type ExtractTextFromImageResponse = z.infer<typeof ExtractTextFromImageResponseSchema>;
