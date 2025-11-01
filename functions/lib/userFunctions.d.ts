/**
 * Get user decks with cards
 */
export declare const getUserDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
        cards: {
            id: string;
        }[];
        id: string;
    }[];
}>, unknown>;
/**
 * Update card progress after review
 */
export declare const updateCardProgress: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Get user progress and statistics
 */
export declare const getUserProgress: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    stats: any;
    recentSessions: {
        id: string;
    }[];
    streak: number;
    lastStudyDate: any;
}>, unknown>;
/**
 * Get user settings
 */
export declare const getUserSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    settings: any;
}>, unknown>;
/**
 * Process friend requests
 */
export declare const processFriendRequest: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Validate user data on creation
 */
export declare const validateUserData: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    userId: string;
}>>;
/**
 * Return server authoritative time and optional active season info
 */
export declare const serverNow: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    nowMs: number;
    iso: string;
}>, unknown>;
/**
 * Get or initialize current season (weekly windows, server-defined)
 * Collection: ranking/currentSeason
 */
export declare const getCurrentSeason: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    readonly seasonId: string;
    readonly startAt: Date;
    readonly endAt: Date;
    readonly status: "active";
} | {
    seasonId: string;
    startAt: any;
    endAt: any;
    status: string;
}>, unknown>;
/**
 * Submit points for current season (authoritative, server-timestamped)
 * Request: { userId: string; delta: number }
 */
export declare const submitPoints: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Close current season and publish simple leaderboard snapshot
 * For production, consider Cloud Scheduler to call this weekly.
 */
export declare const weeklyRollOver: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    nextSeasonId: string;
}>, unknown>;
