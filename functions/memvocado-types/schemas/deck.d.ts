import { z } from "zod";
/**
 * Pola edytowalne talii (formularz)
 */
export declare const DeckCoreSchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodString;
    icon: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodBoolean;
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    tags: string[];
    title: string;
    category: string;
    icon: string;
    isPublic: boolean;
    updatedAt?: Date | undefined;
}, {
    title: string;
    category: string;
    isPublic: boolean;
    updatedAt?: unknown;
    tags?: string[] | undefined;
    icon?: string | undefined;
}>;
export type DeckCore = z.infer<typeof DeckCoreSchema>;
/**
 * Timestampy talii
 */
export declare const DeckTimestampSchema: z.ZodObject<{
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    createdAt: Date;
}, {
    createdAt?: unknown;
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
    category: z.ZodString;
    icon: z.ZodDefault<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodBoolean;
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
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
}, "strict", z.ZodTypeAny, {
    createdAt: Date;
    id: string;
    tags: string[];
    title: string;
    category: string;
    icon: string;
    isPublic: boolean;
    views: number;
    likes: number;
    cardsNum: number;
    createdBy: string;
    is_deleted: boolean;
    updatedAt?: Date | undefined;
    deletedAt?: Date | undefined;
}, {
    id: string;
    title: string;
    category: string;
    isPublic: boolean;
    cardsNum: number;
    createdBy: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    tags?: string[] | undefined;
    icon?: string | undefined;
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
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    updatedAt?: Date | undefined;
    lastReviewDate?: Date | undefined;
}, {
    updatedAt?: unknown;
    lastReviewDate?: unknown;
}>;
export type DeckLearningTimestamp = z.infer<typeof DeckLearningTimestampSchema>;
export declare const DeckLearningMetaSchema: z.ZodObject<{
    id: z.ZodString;
    cardsNum: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    id: string;
    cardsNum: number;
}, {
    id: string;
    cardsNum: number;
}>;
export type DeckLearningMeta = z.infer<typeof DeckLearningMetaSchema>;
export declare const DeckLearningDataSchema: z.ZodObject<{
    id: z.ZodString;
    cardsNum: z.ZodNumber;
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
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    settings: {
        zenMode: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
    };
    id: string;
    title: string;
    cardsNum: number;
    updatedAt?: Date | undefined;
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
    lastReviewDate?: unknown;
}>;
export type DeckLearningData = z.infer<typeof DeckLearningDataSchema>;
/**
 * Częściowa aktualizacja pól edytowalnych talii
 * Wszystkie pola są opcjonalne, ale muszą mieć poprawny typ jeśli są podane
 */
export declare const DeckCoreUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
}, "strict", z.ZodTypeAny, {
    updatedAt?: Date | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
}, {
    updatedAt?: unknown;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
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
    category: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
} & {
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    updatedAt?: Date | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
}, {
    updatedAt?: unknown;
    tags?: string[] | undefined;
    title?: string | undefined;
    category?: string | undefined;
    icon?: string | undefined;
    isPublic?: boolean | undefined;
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
