import { z } from "zod";
export declare const ExtractTextFromImageRequestSchema: z.ZodObject<{
    storagePath: z.ZodString;
    mimeType: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    storagePath: string;
    mimeType: string;
}, {
    storagePath: string;
    mimeType?: string | undefined;
}>;
export type ExtractTextFromImageRequest = z.infer<typeof ExtractTextFromImageRequestSchema>;
export declare const ExtractTextFromImageResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    text: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error: string | null;
    text: string | null;
}, {
    success: boolean;
    error: string | null;
    text: string | null;
}>;
export type ExtractTextFromImageResponse = z.infer<typeof ExtractTextFromImageResponseSchema>;
