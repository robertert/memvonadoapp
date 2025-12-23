import { z } from "zod";
export declare const SearchDecksRequestSchema: z.ZodObject<{
    searchText: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodObject<{
        category: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        tags?: string[] | undefined;
        category?: string | undefined;
        author?: string | undefined;
    }, {
        tags?: string[] | undefined;
        category?: string | undefined;
        author?: string | undefined;
    }>>;
    userId: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    userId?: string | undefined;
    searchText?: string | undefined;
    filters?: {
        tags?: string[] | undefined;
        category?: string | undefined;
        author?: string | undefined;
    } | undefined;
    limit?: number | undefined;
}, {
    userId?: string | undefined;
    searchText?: string | undefined;
    filters?: {
        tags?: string[] | undefined;
        category?: string | undefined;
        author?: string | undefined;
    } | undefined;
    limit?: number | undefined;
}>;
export type SearchDecksRequest = z.infer<typeof SearchDecksRequestSchema>;
export declare const GetSearchLogsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetSearchLogsRequest = z.infer<typeof GetSearchLogsRequestSchema>;
export declare const SearchDecksResponseSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPublic: z.ZodBoolean;
    } & {
        id: z.ZodString;
        views: z.ZodDefault<z.ZodNumber>;
        likes: z.ZodDefault<z.ZodNumber>;
        cardsNum: z.ZodNumber;
        createdBy: z.ZodString;
        is_deleted: z.ZodDefault<z.ZodBoolean>;
        deletedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        deletedAt?: Date | undefined;
    }, {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    results: {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        deletedAt?: Date | undefined;
    }[];
    total: number;
}, {
    results: {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }[];
    total: number;
}>;
export type SearchDecksResponse = z.infer<typeof SearchDecksResponseSchema>;
export declare const GetSearchLogsResponseSchema: z.ZodObject<{
    logs: z.ZodArray<z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
        searchText: z.ZodString;
        filters: z.ZodObject<{
            category: z.ZodOptional<z.ZodString>;
            author: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        }, {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        }>;
        resultsCount: z.ZodNumber;
        timestamp: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        id: string;
        searchText: string;
        filters: {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        };
        resultsCount: number;
        timestamp: Date;
        userId?: string | undefined;
    }, {
        id: string;
        searchText: string;
        filters: {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        };
        resultsCount: number;
        userId?: string | undefined;
        timestamp?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    logs: {
        id: string;
        searchText: string;
        filters: {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        };
        resultsCount: number;
        timestamp: Date;
        userId?: string | undefined;
    }[];
}, {
    logs: {
        id: string;
        searchText: string;
        filters: {
            tags?: string[] | undefined;
            category?: string | undefined;
            author?: string | undefined;
        };
        resultsCount: number;
        userId?: string | undefined;
        timestamp?: unknown;
    }[];
}>;
export type GetSearchLogsResponse = z.infer<typeof GetSearchLogsResponseSchema>;
