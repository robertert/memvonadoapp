import { z } from "zod";
export declare const ScanDocumentRequestSchema: z.ZodObject<{
    storagePath: z.ZodString;
    mimeType: z.ZodString;
}, "strict", z.ZodTypeAny, {
    storagePath: string;
    mimeType: string;
}, {
    storagePath: string;
    mimeType: string;
}>;
export type ScanDocumentRequest = z.infer<typeof ScanDocumentRequestSchema>;
export declare const ScanDocumentResponseSchema: z.ZodObject<{
    flashcards: z.ZodArray<z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
    }, {
        front: string;
        back: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    flashcards: {
        front: string;
        back: string;
    }[];
}, {
    flashcards: {
        front: string;
        back: string;
    }[];
}>;
export type ScanDocumentResponse = z.infer<typeof ScanDocumentResponseSchema>;
