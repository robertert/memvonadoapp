import { z } from "zod";
/**
 * Pola edytowalne talii (formularz)
 */
export declare const DeckCoreSchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodBoolean;
    frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    tags: string[];
    title: string;
    icon: string;
    isPublic: boolean;
    category?: string | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}, {
    title: string;
    isPublic: boolean;
    tags?: string[] | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}>;
export type DeckCore = z.infer<typeof DeckCoreSchema>;
/**
 * Timestampy talii
 */
export declare const DeckTimestampSchema: z.ZodObject<{
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    createdAt: Date;
    updatedAt: Date;
}, {
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export type DeckTimestamp = z.infer<typeof DeckTimestampSchema>;
/**
 * Dane meta talii (systemowe)
 */
export declare const DeckMetaSchema: z.ZodObject<{
    id: z.ZodString;
    views: z.ZodDefault<z.ZodNumber>;
    likes: z.ZodDefault<z.ZodNumber>;
    cardsNum: z.ZodNumber;
    createdBy: z.ZodString;
    is_deleted: z.ZodDefault<z.ZodBoolean>;
    deletedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    views: number;
    likes: number;
    cardsNum: number;
    createdBy: string;
    is_deleted: boolean;
    deletedAt?: Date | undefined;
}, {
    id: string;
    cardsNum: number;
    createdBy: string;
    views?: number | undefined;
    likes?: number | undefined;
    is_deleted?: boolean | undefined;
    deletedAt?: unknown;
}>;
export type DeckMeta = z.infer<typeof DeckMetaSchema>;
/**
 * Dane talii podczas tworzenia (backend)
 */
export declare const DeckSchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodBoolean;
    frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
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
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    views?: number | undefined;
    likes?: number | undefined;
    is_deleted?: boolean | undefined;
    deletedAt?: unknown;
}>;
export type Deck = z.infer<typeof DeckSchema>;
/**
 * Ustawienia talii kart
 */
export declare const DeckSettingsSchema: z.ZodObject<{
    dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
    newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
    zenMode: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    zenMode: boolean;
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
}, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
}>;
export type DeckSettings = z.infer<typeof DeckSettingsSchema>;
/**
 * Talia do nauki (users/{userId}/decks/{deckId})
 */
export declare const DeckLearningCoreSchema: z.ZodObject<{
    title: z.ZodString;
    settings: z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        zenMode: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    settings: {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    };
    title: string;
}, {
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    };
    title: string;
}>;
export type DeckLearningCore = z.infer<typeof DeckLearningCoreSchema>;
export declare const DeckLearningTimestampSchema: z.ZodObject<{
    lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    updatedAt: Date;
    lastReviewDate?: Date | undefined;
}, {
    updatedAt?: unknown;
    lastReviewDate?: unknown;
}>;
export type DeckLearningTimestamp = z.infer<typeof DeckLearningTimestampSchema>;
export declare const DeckLearningMetaSchema: z.ZodObject<{
    id: z.ZodString;
    cardsNum: z.ZodNumber;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    cardsNum: number;
    tags?: string[] | null | undefined;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    isPublic?: boolean | null | undefined;
}, {
    id: string;
    cardsNum: number;
    tags?: string[] | null | undefined;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    isPublic?: boolean | null | undefined;
}>;
export type DeckLearningMeta = z.infer<typeof DeckLearningMetaSchema>;
export declare const DeckLearningDataSchema: z.ZodObject<{
    id: z.ZodString;
    cardsNum: z.ZodNumber;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
} & {
    title: z.ZodString;
    settings: z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        zenMode: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    }>;
} & {
    lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    settings: {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    };
    updatedAt: Date;
    id: string;
    title: string;
    cardsNum: number;
    tags?: string[] | null | undefined;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    isPublic?: boolean | null | undefined;
    lastReviewDate?: Date | undefined;
}, {
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    };
    id: string;
    title: string;
    cardsNum: number;
    updatedAt?: unknown;
    tags?: string[] | null | undefined;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    isPublic?: boolean | null | undefined;
    lastReviewDate?: unknown;
}>;
export type DeckLearningData = z.infer<typeof DeckLearningDataSchema>;
/**
 * Częściowa aktualizacja pól edytowalnych talii
 * Wszystkie pola są opcjonalne, ale muszą mieć poprawny typ jeśli są podane
 */
export declare const DeckCoreUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    frontLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    backLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strict", z.ZodTypeAny, {
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}, {
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}>;
export type DeckCoreUpdate = z.infer<typeof DeckCoreUpdateSchema>;
/**
 * Częściowa aktualizacja ustawień talii
 */
export declare const DeckSettingsUpdateSchema: z.ZodObject<{
    dueCardsNumPerDay: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    newCardsNumPerDay: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    zenMode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
}, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
}>;
export type DeckSettingsUpdate = z.infer<typeof DeckSettingsUpdateSchema>;
/**
 * Częściowa aktualizacja danych talii (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdBy, views, etc.
 */
export declare const DeckUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    frontLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    backLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
} & {
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    updatedAt?: Date | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}, {
    updatedAt?: unknown;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}>;
export type DeckUpdate = z.infer<typeof DeckUpdateSchema>;
/**
 * Częściowa aktualizacja danych nauki talii
 */
export declare const DeckLearningDataUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        zenMode: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    }>>;
} & {
    lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    settings?: {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    } | undefined;
    title?: string | undefined;
    lastReviewDate?: Date | undefined;
}, {
    settings?: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
    } | undefined;
    title?: string | undefined;
    lastReviewDate?: unknown;
}>;
export type DeckLearningDataUpdate = z.infer<typeof DeckLearningDataUpdateSchema>;
