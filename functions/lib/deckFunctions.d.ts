import { CardGrade } from "./types/common";
/**
 * Bulk create deck with cards
 */
export declare const createDeckWithCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    deckId: string;
}>, unknown>;
/**
 * Get deck details only (without cards)
 */
export declare const getDeckDetails: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    username: string;
    deck: {
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
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    } | null;
}>, unknown>;
/**
 * Get cards for a deck with pagination
 */
export declare const getDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("memvocado-types/schemas/card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
/**
 * Get popular public decks
 */
export declare const getPopularDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
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
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    }[];
}>, unknown>;
/**
 * User-deck equivalents (operate on users/{userId}/decks/{deckId})
 */
export declare const getUserDeckDetails: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    deck: {
        id: string;
        title: string;
        updatedAt: Date;
        cardsNum: number;
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            learningMode?: "srs" | "all_in_one" | undefined;
        };
        category?: string | null | undefined;
        icon?: string | null | undefined;
        tags?: string[] | null | undefined;
        isPublic?: boolean | null | undefined;
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
    } | null;
    createdDeck: boolean;
}>, unknown>;
export declare const getUserDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("memvocado-types/schemas/card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
export declare const getUserDueDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("memvocado-types/schemas/card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}>, unknown>;
export declare const getDeckDailyStats: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    dailyStats: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null;
}>, unknown>;
export declare const getUserNewDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("memvocado-types/schemas/card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}>, unknown>;
export declare const startLearningSession: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("memvocado-types/schemas/card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    dailyStats: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    };
    deck: {
        id: string;
        title: string;
        updatedAt: Date;
        cardsNum: number;
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            learningMode?: "srs" | "all_in_one" | undefined;
        };
        category?: string | null | undefined;
        icon?: string | null | undefined;
        tags?: string[] | null | undefined;
        isPublic?: boolean | null | undefined;
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
    };
}>, unknown>;
/**
 * Update user stats when deck is modified
 */
export declare const updateUserStats: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    userId: string;
    deckId: string;
}>>;
export declare const getDailyUserStats: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null;
}>, unknown>;
/**
 * Update user stats when card is reviewed
 */
/**
 * Sync denormalized fields (category, icon, tags) to all user copies when source deck is updated
 * Triggered on write to decks/{deckId}
 */
export declare const syncDeckMetadataToUserCopies: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    deckId: string;
}>>;
/**
 * Reset deck progress - removes all card progress data
 */
export declare const resetDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
}>, unknown>;
/**
 * Update deck settings
 */
export declare const updateDeckSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
}>, unknown>;
/**
 * Update user deck settings
 */
export declare const updateUserDeckSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
}>, unknown>;
/**
 * Copy a public deck into user's personal space to track individual progress
 * Source: decks/{deckId}
 * Target: users/{userId}/decks/{deckId} + cards
 */
export declare const startLearningDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    deck: {
        id: string;
        title: string;
        updatedAt: Date;
        cardsNum: number;
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            learningMode?: "srs" | "all_in_one" | undefined;
        };
        category?: string | null | undefined;
        icon?: string | null | undefined;
        tags?: string[] | null | undefined;
        isPublic?: boolean | null | undefined;
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
    };
}>, unknown>;
/**
 * Soft delete a deck - marks as deleted and notifies all users learning it
 */
export declare const deleteDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    notifiedUsers: number;
}>, unknown>;
/**
 * Check for changes between source deck and user's local copy
 * Returns list of cards with differences
 */
export declare const checkCardChanges: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    changes: {
        type: "modified" | "deleted" | "new";
        cardId: string;
        changes?: {
            field: string;
            oldValue?: any;
            newValue?: any;
        }[] | undefined;
    }[];
}>, unknown>;
/**
 * Synchronize user's local card copies with source deck
 * Options: syncAll (all changes) or syncSelected (specific cardIds)
 */
export declare const syncDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    syncedCount: number;
}>, unknown>;
/**
 * Update card content (cardData and tags) - only for source deck authors
 */
export declare const updateCardContent: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Update deck with cards - accepts only changes (no card fetching)
 * Optimized to avoid Firestore reads by accepting client-side diffing
 */
export declare const updateDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    updatedCount: number;
    createdCount: number;
    deletedCount: number;
}>, unknown>;
/**
 * Import Anki deck (.apkg file) and convert to Memvocado cards
 */
export declare const importAnkiDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    deckId: string;
    count: number;
}>, unknown>;
/**
 * Record a view for a deck (called when user starts learning)
 * Each user can only count as one view per deck
 */
export declare const recordDeckView: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    isNewView: boolean;
}>, unknown>;
/**
 * Toggle like on a deck
 * Creates notification for deck creator when liked
 */
export declare const toggleDeckLike: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    liked: boolean;
    newLikeCount: number;
}>, unknown>;
/**
 * Check if user has liked a deck
 */
export declare const checkIfLiked: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    isLiked: boolean;
}>, unknown>;
