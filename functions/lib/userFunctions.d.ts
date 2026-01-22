/**
 * Aktualizuje streak użytkownika „na żądanie" przy starcie aplikacji.
 * Bazuje na tym, czy wczoraj (w strefie czasowej użytkownika) była jakakolwiek sesja.
 * Idempotentne dzięki polu stats.lastStreakDate (YYYY-MM-DD).
 */
export declare const updateUserStreakOnLogin: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    status: "streak_safe" | "streak_reset";
    currentStreak: number;
    updated: boolean;
    longestStreak?: number | undefined;
    lastStreakDate?: string | undefined;
    previousStreak?: number | undefined;
} | {
    updated: boolean;
    currentStreak: any;
    status: string;
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
    updated: boolean;
    qualified: boolean;
    threshold: number;
    todayCount?: number | null | undefined;
    avocadoGrew?: boolean | undefined;
    avocadoPreviousPhase?: number | undefined;
    avocadoCurrentPhase?: number | undefined;
    avocadoConsecutiveDays?: number | undefined;
    avocadoCanHarvest?: boolean | undefined;
}>, unknown>;
/**
 * Get user decks with cards
 */
export declare const getUserDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    decks: {
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
    }[];
}>, unknown>;
export declare const undoCard: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
export declare const updateCardProgressAllInOne: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
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
    };
}>, unknown>;
/**
 * Get user settings
 */
export declare const getUserSettings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    settings: {};
}>, unknown>;
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
    id: string;
    createdAt: Date;
    updatedAt: Date;
    settings: {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    };
    username: string;
    email: string;
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
    dailyStats?: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null | undefined;
    avocadoGrowth?: {
        currentPhase: number;
        consecutiveDays: number;
        totalHarvests: number;
        collectedSkins: {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt: Date;
        }[];
        harvestHistory: {
            skinId: string;
            harvestedAt: Date;
        }[];
        lastGrowthDate?: Date | null | undefined;
    } | null | undefined;
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
