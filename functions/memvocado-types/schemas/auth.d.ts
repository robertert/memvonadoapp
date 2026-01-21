import { z } from "zod";
/**
 * Żądanie rejestracji użytkownika wykonywane przez frontend.
 * Bazuje na minimalnych danych potrzebnych do utworzenia konta.
 */
export declare const AuthRegisterRequestSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    email: string;
    language?: string | undefined;
    username?: string | undefined;
}, {
    email: string;
    language?: string | undefined;
    username?: string | undefined;
}>;
export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;
/**
 * Żądanie logowania użytkownika.
 */
export declare const AuthLoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;
/**
 * Snapshot danych użytkownika zwracany w odpowiedziach auth.
 * Pozwala na obecność dodatkowych pól przechowywanych w dokumencie.
 */
export declare const AuthUserSnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
        dailyGoal: z.ZodDefault<z.ZodNumber>;
        dailyNew: z.ZodOptional<z.ZodNumber>;
        language: z.ZodDefault<z.ZodString>;
        timeZone: z.ZodDefault<z.ZodString>;
        defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
    }, "strict", z.ZodTypeAny, {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }, {
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        dailyGoal?: number | undefined;
        dailyNew?: number | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }>;
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    league: z.ZodDefault<z.ZodNumber>;
    currentGroupId: z.ZodNullable<z.ZodString>;
    experiencePoints: z.ZodDefault<z.ZodNumber>;
    currencyCount: z.ZodDefault<z.ZodNumber>;
    stats: z.ZodObject<{
        totalCards: z.ZodDefault<z.ZodNumber>;
        totalDecks: z.ZodDefault<z.ZodNumber>;
        totalReviews: z.ZodDefault<z.ZodNumber>;
        averageDifficulty: z.ZodOptional<z.ZodNumber>;
        currentStreak: z.ZodDefault<z.ZodNumber>;
        longestStreak: z.ZodDefault<z.ZodNumber>;
        lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strip", z.ZodTypeAny, {
        totalCards: number;
        totalDecks: number;
        totalReviews: number;
        currentStreak: number;
        longestStreak: number;
        averageDifficulty?: number | undefined;
        lastStreakDate?: Date | undefined;
        lastStudyDate?: Date | undefined;
    }, {
        totalCards?: number | undefined;
        totalDecks?: number | undefined;
        totalReviews?: number | undefined;
        averageDifficulty?: number | undefined;
        currentStreak?: number | undefined;
        longestStreak?: number | undefined;
        lastStreakDate?: unknown;
        lastStudyDate?: unknown;
    }>;
    followingCount: z.ZodDefault<z.ZodNumber>;
    followersCount: z.ZodDefault<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
        dailyGoal: z.ZodDefault<z.ZodNumber>;
        dailyNew: z.ZodOptional<z.ZodNumber>;
        language: z.ZodDefault<z.ZodString>;
        timeZone: z.ZodDefault<z.ZodString>;
        defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
    }, "strict", z.ZodTypeAny, {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }, {
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        dailyGoal?: number | undefined;
        dailyNew?: number | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }>;
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    league: z.ZodDefault<z.ZodNumber>;
    currentGroupId: z.ZodNullable<z.ZodString>;
    experiencePoints: z.ZodDefault<z.ZodNumber>;
    currencyCount: z.ZodDefault<z.ZodNumber>;
    stats: z.ZodObject<{
        totalCards: z.ZodDefault<z.ZodNumber>;
        totalDecks: z.ZodDefault<z.ZodNumber>;
        totalReviews: z.ZodDefault<z.ZodNumber>;
        averageDifficulty: z.ZodOptional<z.ZodNumber>;
        currentStreak: z.ZodDefault<z.ZodNumber>;
        longestStreak: z.ZodDefault<z.ZodNumber>;
        lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strip", z.ZodTypeAny, {
        totalCards: number;
        totalDecks: number;
        totalReviews: number;
        currentStreak: number;
        longestStreak: number;
        averageDifficulty?: number | undefined;
        lastStreakDate?: Date | undefined;
        lastStudyDate?: Date | undefined;
    }, {
        totalCards?: number | undefined;
        totalDecks?: number | undefined;
        totalReviews?: number | undefined;
        averageDifficulty?: number | undefined;
        currentStreak?: number | undefined;
        longestStreak?: number | undefined;
        lastStreakDate?: unknown;
        lastStudyDate?: unknown;
    }>;
    followingCount: z.ZodDefault<z.ZodNumber>;
    followersCount: z.ZodDefault<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
        dailyGoal: z.ZodDefault<z.ZodNumber>;
        dailyNew: z.ZodOptional<z.ZodNumber>;
        language: z.ZodDefault<z.ZodString>;
        timeZone: z.ZodDefault<z.ZodString>;
        defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
    }, "strict", z.ZodTypeAny, {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }, {
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        dailyGoal?: number | undefined;
        dailyNew?: number | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    }>;
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    league: z.ZodDefault<z.ZodNumber>;
    currentGroupId: z.ZodNullable<z.ZodString>;
    experiencePoints: z.ZodDefault<z.ZodNumber>;
    currencyCount: z.ZodDefault<z.ZodNumber>;
    stats: z.ZodObject<{
        totalCards: z.ZodDefault<z.ZodNumber>;
        totalDecks: z.ZodDefault<z.ZodNumber>;
        totalReviews: z.ZodDefault<z.ZodNumber>;
        averageDifficulty: z.ZodOptional<z.ZodNumber>;
        currentStreak: z.ZodDefault<z.ZodNumber>;
        longestStreak: z.ZodDefault<z.ZodNumber>;
        lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strip", z.ZodTypeAny, {
        totalCards: number;
        totalDecks: number;
        totalReviews: number;
        currentStreak: number;
        longestStreak: number;
        averageDifficulty?: number | undefined;
        lastStreakDate?: Date | undefined;
        lastStudyDate?: Date | undefined;
    }, {
        totalCards?: number | undefined;
        totalDecks?: number | undefined;
        totalReviews?: number | undefined;
        averageDifficulty?: number | undefined;
        currentStreak?: number | undefined;
        longestStreak?: number | undefined;
        lastStreakDate?: unknown;
        lastStudyDate?: unknown;
    }>;
    followingCount: z.ZodDefault<z.ZodNumber>;
    followersCount: z.ZodDefault<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export type AuthUserSnapshot = z.infer<typeof AuthUserSnapshotSchema>;
export declare const AuthRegisterResponseSchema: z.ZodObject<{
    uid: z.ZodString;
    customToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strict", z.ZodTypeAny, {
    uid: string;
    customToken: string;
    user: {
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
    } & {
        [k: string]: unknown;
    };
}, {
    uid: string;
    customToken: string;
    user: {
        id: string;
        settings: {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        };
        username: string;
        email: string;
        currentGroupId: string | null;
        stats: {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        league?: number | undefined;
        experiencePoints?: number | undefined;
        currencyCount?: number | undefined;
        followingCount?: number | undefined;
        followersCount?: number | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
export type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;
export declare const AuthLoginResponseSchema: z.ZodObject<{
    uid: z.ZodString;
    customToken: z.ZodString;
    idToken: z.ZodOptional<z.ZodString>;
    refreshToken: z.ZodOptional<z.ZodString>;
    expiresIn: z.ZodOptional<z.ZodNumber>;
    user: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strict", z.ZodTypeAny, {
    uid: string;
    customToken: string;
    user?: z.objectOutputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    idToken?: string | undefined;
    refreshToken?: string | undefined;
    expiresIn?: number | undefined;
}, {
    uid: string;
    customToken: string;
    user?: z.objectInputType<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        settings: z.ZodObject<{
            theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
            notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
            dailyGoal: z.ZodDefault<z.ZodNumber>;
            dailyNew: z.ZodOptional<z.ZodNumber>;
            language: z.ZodDefault<z.ZodString>;
            timeZone: z.ZodDefault<z.ZodString>;
            defaultLearningMode: z.ZodOptional<z.ZodEnum<["srs", "all_in_one"]>>;
        }, "strict", z.ZodTypeAny, {
            theme: "light" | "dark";
            notificationsEnabled: boolean;
            dailyGoal: number;
            language: string;
            timeZone: string;
            dailyNew?: number | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }, {
            theme?: "light" | "dark" | undefined;
            notificationsEnabled?: boolean | undefined;
            dailyGoal?: number | undefined;
            dailyNew?: number | undefined;
            language?: string | undefined;
            timeZone?: string | undefined;
            defaultLearningMode?: "srs" | "all_in_one" | undefined;
        }>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        league: z.ZodDefault<z.ZodNumber>;
        currentGroupId: z.ZodNullable<z.ZodString>;
        experiencePoints: z.ZodDefault<z.ZodNumber>;
        currencyCount: z.ZodDefault<z.ZodNumber>;
        stats: z.ZodObject<{
            totalCards: z.ZodDefault<z.ZodNumber>;
            totalDecks: z.ZodDefault<z.ZodNumber>;
            totalReviews: z.ZodDefault<z.ZodNumber>;
            averageDifficulty: z.ZodOptional<z.ZodNumber>;
            currentStreak: z.ZodDefault<z.ZodNumber>;
            longestStreak: z.ZodDefault<z.ZodNumber>;
            lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        }, "strip", z.ZodTypeAny, {
            totalCards: number;
            totalDecks: number;
            totalReviews: number;
            currentStreak: number;
            longestStreak: number;
            averageDifficulty?: number | undefined;
            lastStreakDate?: Date | undefined;
            lastStudyDate?: Date | undefined;
        }, {
            totalCards?: number | undefined;
            totalDecks?: number | undefined;
            totalReviews?: number | undefined;
            averageDifficulty?: number | undefined;
            currentStreak?: number | undefined;
            longestStreak?: number | undefined;
            lastStreakDate?: unknown;
            lastStudyDate?: unknown;
        }>;
        followingCount: z.ZodDefault<z.ZodNumber>;
        followersCount: z.ZodDefault<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    idToken?: string | undefined;
    refreshToken?: string | undefined;
    expiresIn?: number | undefined;
}>;
export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;
