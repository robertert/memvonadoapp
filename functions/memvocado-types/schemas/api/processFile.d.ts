import { z } from "zod";
export declare const ProcessFileRequestSchema: z.ZodObject<{
    storagePath: z.ZodString;
    mimeType: z.ZodString;
    hint: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fileName: z.ZodOptional<z.ZodString>;
    detail: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
}, "strict", z.ZodTypeAny, {
    storagePath: string;
    mimeType: string;
    detail: "low" | "medium" | "high";
    hint?: string | null | undefined;
    fileName?: string | undefined;
}, {
    storagePath: string;
    mimeType: string;
    hint?: string | null | undefined;
    fileName?: string | undefined;
    detail?: "low" | "medium" | "high" | undefined;
}>;
export type ProcessFileRequest = z.infer<typeof ProcessFileRequestSchema>;
export declare const ProcessFileFlashcardSchema: z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    tags: string[];
    front: string;
    back: string;
}, {
    front: string;
    back: string;
    tags?: string[] | undefined;
}>;
export declare const ProcessFileMetaSchema: z.ZodObject<{
    detected_topic: z.ZodString;
    detected_mode: z.ZodEnum<["vocabulary", "exam_qa", "concept"]>;
    source_type: z.ZodString;
}, "strip", z.ZodTypeAny, {
    detected_topic: string;
    detected_mode: "vocabulary" | "exam_qa" | "concept";
    source_type: string;
}, {
    detected_topic: string;
    detected_mode: "vocabulary" | "exam_qa" | "concept";
    source_type: string;
}>;
export declare const ProcessFileResponseSchema: z.ZodObject<{
    meta: z.ZodObject<{
        detected_topic: z.ZodString;
        detected_mode: z.ZodEnum<["vocabulary", "exam_qa", "concept"]>;
        source_type: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        detected_topic: string;
        detected_mode: "vocabulary" | "exam_qa" | "concept";
        source_type: string;
    }, {
        detected_topic: string;
        detected_mode: "vocabulary" | "exam_qa" | "concept";
        source_type: string;
    }>;
    flashcards: z.ZodArray<z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        front: string;
        back: string;
    }, {
        front: string;
        back: string;
        tags?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    meta: {
        detected_topic: string;
        detected_mode: "vocabulary" | "exam_qa" | "concept";
        source_type: string;
    };
    flashcards: {
        tags: string[];
        front: string;
        back: string;
    }[];
}, {
    meta: {
        detected_topic: string;
        detected_mode: "vocabulary" | "exam_qa" | "concept";
        source_type: string;
    };
    flashcards: {
        front: string;
        back: string;
        tags?: string[] | undefined;
    }[];
}>;
export type ProcessFileResponse = z.infer<typeof ProcessFileResponseSchema>;
