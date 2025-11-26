import { Card, DeckLearningData, Deck, CardGrade } from "./types/common";
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
    deck: Deck;
    username: string;
}>, unknown>;
/**
 * Get cards for a deck with pagination
 */
export declare const getDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: Card[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
/**
 * Get popular public decks
 */
export declare const getPopularDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: Deck[];
}>, unknown>;
/**
 * User-deck equivalents (operate on users/{userId}/decks/{deckId})
 */
export declare const getUserDeckDetails: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    deck: null;
} | {
    deck: DeckLearningData;
}>, unknown>;
export declare const getUserDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
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
        grade?: CardGrade | undefined;
        hasChanges?: boolean | undefined;
        contentVersion?: Date | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
export declare const getUserDueDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: Card[];
}>, unknown>;
export declare const getUserNewDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
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
        grade?: CardGrade | undefined;
        hasChanges?: boolean | undefined;
        contentVersion?: Date | undefined;
    }[];
}>, unknown>;
/**
 * Update user stats when deck is modified
 */
export declare const updateUserStats: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    deckId: string;
    userId: string;
}>>;
/**
 * Reset deck progress - removes all card progress data
 */
export declare const resetDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    cardsReset: number;
}>, unknown>;
/**
 * Update deck settings
 */
export declare const updateDeckSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Copy a public deck into user's personal space to track individual progress
 * Source: decks/{deckId}
 * Target: users/{userId}/decks/{deckId} + cards
 */
export declare const startLearningDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Soft delete a deck - marks as deleted and notifies all users learning it
 */
export declare const deleteDeck: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
} | {
    success: boolean;
    notifiedUsers: number;
}>, unknown>;
/**
 * Check for changes between source deck and user's local copy
 * Returns list of cards with differences
 */
export declare const checkCardChanges: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    changes: {
        cardId: string;
        type: "modified" | "deleted" | "new";
        changes?: Array<{
            field: string;
            oldValue: unknown;
            newValue: unknown;
        }>;
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
