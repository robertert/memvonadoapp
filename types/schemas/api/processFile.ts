import { z } from "zod";

// ===========================
// Process File schemas
// ===========================

export const ProcessFileRequestSchema = z
  .object({
    storagePath: z.string().min(1),
    mimeType: z.string().min(1),
    hint: z.string().optional().nullable(),
    fileName: z.string().optional(),
    detail: z.enum(["low", "medium", "high"]).default("medium"),
  })
  .strict();
export type ProcessFileRequest = z.infer<typeof ProcessFileRequestSchema>;

export const ProcessFileFlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  tags: z.array(z.string()).default([]),
});

export const ProcessFileMetaSchema = z.object({
  detected_topic: z.string(),
  detected_mode: z.enum(["vocabulary", "exam_qa", "concept"]),
  source_type: z.string(),
});

export const ProcessFileResponseSchema = z.object({
  meta: ProcessFileMetaSchema,
  flashcards: z.array(ProcessFileFlashcardSchema),
});
export type ProcessFileResponse = z.infer<typeof ProcessFileResponseSchema>;
