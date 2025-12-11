/**
 * Aktualizuje streak użytkownika „na żądanie” przy starcie aplikacji.
 * Bazuje na tym, czy wczoraj (w strefie czasowej użytkownika) była jakakolwiek sesja.
 * Idempotentne dzięki polu stats.lastStreakDate (YYYY-MM-DD).
 */
export declare const updateUserStreakOnLogin: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: any;
    updated: boolean;
}>, unknown>;
/**
 * Aktualizuje streak natychmiast po spełnieniu progu dziennego
 * (np. 10 kart w danym dniu). Jeżeli użytkownik już ma zapisany
 * stats.lastStreakDate == dzisiaj (w jego strefie), nie robi nic.
 * Liczy liczbę sesji przypadających na dzisiejszy dzień w strefie
 * i gdy osiągnie próg, inkrementuje streak i zapisuje lastStreakDate.
 *
 * request.data: { userId: string, timeZone?: string, threshold?: number }
 */
export declare const updateUserStreakIfQualified: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    qualified: boolean;
    updated: boolean;
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: string | null;
    threshold: number;
    todayCount: number | undefined;
}>, unknown>;
/**
 * Get user decks with cards
 */
export declare const getUserDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
        createdAt: Date;
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
        updatedAt?: Date | undefined;
        category?: string | undefined;
        deletedAt?: Date | undefined;
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
    userProgress: {
        dailyGoal: number;
        stats: {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        };
        recentSessions: any[];
        todaySessionsCount: number;
    };
}>, unknown>;
/**
 * Get user settings
 */
export declare const getUserSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    settings: any;
}>, unknown>;
/**
 * Validate user data on creation
 * @param {any} event - event object
 * @return {Promise<void>}
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
        totalCards: number;
        totalDecks: number;
        totalReviews: number;
        currentStreak: number;
        longestStreak: number;
        averageDifficulty?: number | undefined;
        lastStreakDate?: Date | undefined;
        lastStudyDate?: Date | undefined;
    };
    streak: number;
    league: number;
    points: number;
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
