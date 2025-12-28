/**
 * Aktualizuje streak użytkownika „na żądanie” przy starcie aplikacji.
 * Bazuje na tym, czy wczoraj (w strefie czasowej użytkownika) była jakakolwiek sesja.
 * Idempotentne dzięki polu stats.lastStreakDate (YYYY-MM-DD).
 */
export declare const updateUserStreakOnLogin: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: string;
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
    currentStreak: number;
    longestStreak: number;
    lastStreakDate: string | null;
    threshold: number;
    qualified: boolean;
    updated: boolean;
    todayCount?: number | undefined;
}>, unknown>;
/**
 * Get user decks with cards
 */
export declare const getUserDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
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
        deletedAt?: Date | undefined;
    }[];
}>, unknown>;
/**
 * Update card progress after review
 */
export declare const updateCardProgress: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
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
    settings: {};
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
    status: string;
    seasonId: string;
    startAt: Date;
    endAt: Date;
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
    message?: string | undefined;
}>, unknown>;
/**
 * Get user profile with full information
 */
export declare const getUserProfile: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    username: string;
    email: string;
    settings: {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
    id: string;
    league: number;
    currentGroupId: string | null;
    experiencePoints: number;
    currencyCount: number;
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
    followingCount: number;
    followersCount: number;
    interests: string[];
    profileCompleted?: boolean | undefined;
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
    awards: any[];
}>, unknown>;
