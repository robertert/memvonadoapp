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
    title: string;
    icon: string;
    tags: string[];
    isPublic: boolean;
    category?: string | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}, {
    title: string;
    isPublic: boolean;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
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
    title_lower: z.ZodOptional<z.ZodString>;
    editors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    id: string;
    views: number;
    likes: number;
    cardsNum: number;
    createdBy: string;
    is_deleted: boolean;
    editors: string[];
    deletedAt?: Date | undefined;
    title_lower?: string | undefined;
}, {
    id: string;
    cardsNum: number;
    createdBy: string;
    views?: number | undefined;
    likes?: number | undefined;
    is_deleted?: boolean | undefined;
    deletedAt?: unknown;
    title_lower?: string | undefined;
    editors?: string[] | undefined;
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
    title_lower: z.ZodOptional<z.ZodString>;
    editors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
} & {
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    id: string;
    title: string;
    icon: string;
    tags: string[];
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    views: number;
    likes: number;
    cardsNum: number;
    createdBy: string;
    is_deleted: boolean;
    editors: string[];
    category?: string | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    deletedAt?: Date | undefined;
    title_lower?: string | undefined;
}, {
    id: string;
    title: string;
    isPublic: boolean;
    cardsNum: number;
    createdBy: string;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    createdAt?: unknown;
    updatedAt?: unknown;
    views?: number | undefined;
    likes?: number | undefined;
    is_deleted?: boolean | undefined;
    deletedAt?: unknown;
    title_lower?: string | undefined;
    editors?: string[] | undefined;
}>;
export type Deck = z.infer<typeof DeckSchema>;
/**
 * Learning mode for a deck
 */
export declare const LearningModeSchema: z.ZodEnum<["srs", "all_in_one"]>;
export type LearningMode = z.infer<typeof LearningModeSchema>;
/**
 * Ustawienia talii kart
 */
export declare const DeckSettingsSchema: z.ZodObject<{
    dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
    newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
    zenMode: z.ZodDefault<z.ZodBoolean>;
    shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
    learningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
    bidirectional: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    zenMode: boolean;
    shuffleNewCards: boolean;
    bidirectional: boolean;
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    learningMode?: "srs" | "all_in_one" | undefined;
}, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
    shuffleNewCards?: boolean | undefined;
    learningMode?: "srs" | "all_in_one" | undefined;
    bidirectional?: boolean | undefined;
}>;
export type DeckSettings = z.infer<typeof DeckSettingsSchema>;
/**
 * Statystyki dzienne dla talii
 */
export declare const DailyStatsSchema: z.ZodObject<{
    newCardsRemaining: z.ZodNumber;
    dueCardsRemaining: z.ZodNumber;
    inProgressDueCards: z.ZodNumber;
    inProgressNewCards: z.ZodNumber;
    completedNewToday: z.ZodNumber;
    completedDueToday: z.ZodNumber;
    lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    newCardsRemaining: number;
    dueCardsRemaining: number;
    inProgressDueCards: number;
    inProgressNewCards: number;
    completedNewToday: number;
    completedDueToday: number;
    lastUpdatedStats: Date;
}, {
    newCardsRemaining: number;
    dueCardsRemaining: number;
    inProgressDueCards: number;
    inProgressNewCards: number;
    completedNewToday: number;
    completedDueToday: number;
    lastUpdatedStats?: unknown;
}>;
export type DailyStats = z.infer<typeof DailyStatsSchema>;
/**
 * Talia do nauki (users/{userId}/decks/{deckId})
 */
export declare const DeckLearningCoreSchema: z.ZodObject<{
    title: z.ZodString;
    settings: z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        zenMode: z.ZodDefault<z.ZodBoolean>;
        shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        learningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        bidirectional: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    title: string;
    settings: {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    };
}, {
    title: string;
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    };
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
    frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title_lower: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    cardsNum: number;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    tags?: string[] | null | undefined;
    isPublic?: boolean | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    title_lower?: string | null | undefined;
}, {
    id: string;
    cardsNum: number;
    category?: string | null | undefined;
    icon?: string | null | undefined;
    tags?: string[] | null | undefined;
    isPublic?: boolean | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    title_lower?: string | null | undefined;
}>;
export type DeckLearningMeta = z.infer<typeof DeckLearningMetaSchema>;
export declare const DeckLearningDataSchema: z.ZodObject<{
    id: z.ZodString;
    cardsNum: z.ZodNumber;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title_lower: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    title: z.ZodString;
    settings: z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
        zenMode: z.ZodDefault<z.ZodBoolean>;
        shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        learningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        bidirectional: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    }>;
} & {
    lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
} & {
    dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    title: string;
    updatedAt: Date;
    cardsNum: number;
    settings: {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    };
    category?: string | null | undefined;
    icon?: string | null | undefined;
    tags?: string[] | null | undefined;
    isPublic?: boolean | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    title_lower?: string | null | undefined;
    lastReviewDate?: Date | undefined;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null | undefined;
}, {
    id: string;
    title: string;
    cardsNum: number;
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    };
    category?: string | null | undefined;
    icon?: string | null | undefined;
    tags?: string[] | null | undefined;
    isPublic?: boolean | null | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    updatedAt?: unknown;
    title_lower?: string | null | undefined;
    lastReviewDate?: unknown;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | null | undefined;
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
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
}, {
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
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
    shuffleNewCards: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    learningMode: z.ZodOptional<z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>>;
    bidirectional: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
    shuffleNewCards?: boolean | undefined;
    learningMode?: "srs" | "all_in_one" | undefined;
    bidirectional?: boolean | undefined;
}, {
    dueCardsNumPerDay?: number | undefined;
    newCardsNumPerDay?: number | undefined;
    zenMode?: boolean | undefined;
    shuffleNewCards?: boolean | undefined;
    learningMode?: "srs" | "all_in_one" | undefined;
    bidirectional?: boolean | undefined;
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
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    updatedAt?: Date | undefined;
}, {
    title?: string | undefined;
    category?: string | null | undefined;
    icon?: string | undefined;
    tags?: string[] | undefined;
    isPublic?: boolean | undefined;
    frontLanguage?: string | null | undefined;
    backLanguage?: string | null | undefined;
    updatedAt?: unknown;
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
        shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        learningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        bidirectional: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    }>>;
} & {
    lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>>;
}, "strict", z.ZodTypeAny, {
    title?: string | undefined;
    settings?: {
        zenMode: boolean;
        shuffleNewCards: boolean;
        bidirectional: boolean;
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
    } | undefined;
    lastReviewDate?: Date | undefined;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null | undefined;
}, {
    title?: string | undefined;
    settings?: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
        learningMode?: "srs" | "all_in_one" | undefined;
        bidirectional?: boolean | undefined;
    } | undefined;
    lastReviewDate?: unknown;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | null | undefined;
}>;
export type DeckLearningDataUpdate = z.infer<typeof DeckLearningDataUpdateSchema>;
/**
 * Viewer document (decks/{deckId}/viewers/{userId})
 */
export declare const DeckViewerSchema: z.ZodObject<{
    viewedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    viewedAt: Date;
}, {
    viewedAt?: unknown;
}>;
export type DeckViewer = z.infer<typeof DeckViewerSchema>;
/**
 * Liked deck document (users/{userId}/likedDecks/{deckId})
 */
export declare const LikedDeckSchema: z.ZodObject<{
    likedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    likedAt: Date;
    deckId: string;
}, {
    deckId: string;
    likedAt?: unknown;
}>;
export type LikedDeck = z.infer<typeof LikedDeckSchema>;
