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
    deck: {
        id: string;
    };
}>, unknown>;
/**
 * Get cards for a deck with pagination
 */
export declare const getDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
/**
 * Get due cards for a deck (server-side filtering)
 * - Returns FSRS due cards (cardAlgo.due <= now)
 * - Returns firstLearn due cards (firstLearn.isNew && firstLearn.due <= now)
 */
export declare const getDueDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
}>, unknown>;
/**
 * Get new candidate cards (firstLearn.isNew && not yet introduced this session)
 */
export declare const getNewDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
}>, unknown>;
/**
 * Get popular public decks
 */
export declare const getPopularDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
        id: string;
    }[];
}>, unknown>;
/**
 * User-deck equivalents (operate on users/{userId}/decks/{deckId})
 */
export declare const getUserDeckDetails: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    deck: {
        id: string;
    };
}>, unknown>;
export declare const getUserDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
    hasMore: boolean;
    lastDocId: string | null;
}>, unknown>;
export declare const getUserDueDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
}>, unknown>;
export declare const getUserNewDeckCards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    cards: any[];
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
