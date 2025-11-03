/**
 * Get user decks with cards
 */
export declare const getUserDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
        cards: any[];
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
 * @param {any} event - event object
 * @return {Promise<void>}
 */
export declare const validateUserData: import("firebase-functions/core").CloudFunction<import("firebase-functions/firestore").FirestoreEvent<import("firebase-functions/firestore").Change<import("firebase-functions/firestore").DocumentSnapshot> | undefined, {
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
/**
 * Update user settings
 */
export declare const updateUserSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Get user profile with full information
 */
export declare const getUserProfile: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    userId: any;
    username: string;
    email: string | null;
    stats: {
        totalCards?: number;
        totalDecks?: number;
        totalReviews?: number;
        averageDifficulty?: number;
    };
    streak: number;
    league: number;
    points: number;
    friendsCount: number;
    followers: number;
    following: number;
}>, unknown>;
/**
 * Get user activity heatmap data
 */
export declare const getUserActivityHeatmap: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    heatmapData: {
        date: string;
        count: number;
    }[];
}>, unknown>;
/**
 * Get user awards
 */
export declare const getUserAwards: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    awards: {
        id: string;
    }[];
}>, unknown>;
/**
 * Get friends streaks
 */
export declare const getFriendsStreaks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    friendsStreaks: {
        userId: string;
        name: string;
        streak: number;
    }[];
}>, unknown>;
