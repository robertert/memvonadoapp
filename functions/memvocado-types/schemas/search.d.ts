import { z } from "zod";
/**
 * Filtry wyszukiwania
 */
export declare const SearchFiltersSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    category?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
}, {
    category?: string | undefined;
    tags?: string[] | undefined;
    author?: string | undefined;
}>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
/**
 * Log wyszukiwania
 */
export declare const SearchLogSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    searchText: z.ZodString;
    filters: z.ZodObject<{
        category: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
    }, {
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
    }>;
    resultsCount: z.ZodNumber;
    timestamp: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    id: string;
    searchText: string;
    filters: {
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
    };
    resultsCount: number;
    timestamp: Date;
    userId?: string | undefined;
}, {
    id: string;
    searchText: string;
    filters: {
        category?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
    };
    resultsCount: number;
    userId?: string | undefined;
    timestamp?: unknown;
}>;
export type SearchLog = z.infer<typeof SearchLogSchema>;
