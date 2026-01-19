import { z } from "zod";

export const ScanDocumentRequestSchema = z
  .object({
    storagePath: z.string(),
    mimeType: z.string(),
  })
  .strict();
export type ScanDocumentRequest = z.infer<typeof ScanDocumentRequestSchema>;

export const ScanDocumentResponseSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ),
});
export type ScanDocumentResponse = z.infer<typeof ScanDocumentResponseSchema>;
