/**
 * Calculate next review date when card is updated
 */
export declare const calculateNextReview: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    deckId: string;
    userId: string;
    cardId: string;
}>>;
