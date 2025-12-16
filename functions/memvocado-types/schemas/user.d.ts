import { z } from "zod";
/**
 * Statystyki użytkownika
 */
export declare const UserStatsSchema: z.ZodObject<{
    totalCards: z.ZodDefault<z.ZodNumber>;
    totalDecks: z.ZodDefault<z.ZodNumber>;
    totalReviews: z.ZodDefault<z.ZodNumber>;
    averageDifficulty: z.ZodOptional<z.ZodNumber>;
    currentStreak: z.ZodDefault<z.ZodNumber>;
    longestStreak: z.ZodDefault<z.ZodNumber>;
    lastStreakDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    lastStudyDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
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
export type UserStats = z.infer<typeof UserStatsSchema>;
/**
 * Ustawienia użytkownika
 */
export declare const UserSettingsSchema: z.ZodObject<{
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
    dailyGoal: z.ZodNumber;
    dailyNew: z.ZodNumber;
    language: z.ZodDefault<z.ZodString>;
    timeZone: z.ZodDefault<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    theme: "light" | "dark";
    notificationsEnabled: boolean;
    dailyGoal: number;
    dailyNew: number;
    language: string;
    timeZone: string;
}, {
    dailyGoal: number;
    dailyNew: number;
    theme?: "light" | "dark" | undefined;
    notificationsEnabled?: boolean | undefined;
    language?: string | undefined;
    timeZone?: string | undefined;
}>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
/**
 * Użytkownik - core fields
 */
export declare const UserCoreSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
        dailyGoal: z.ZodNumber;
        dailyNew: z.ZodNumber;
        language: z.ZodDefault<z.ZodString>;
        timeZone: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        dailyNew: number;
        language: string;
        timeZone: string;
    }, {
        dailyGoal: number;
        dailyNew: number;
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    username: string;
    email: string;
    settings: {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        dailyNew: number;
        language: string;
        timeZone: string;
    };
}, {
    username: string;
    email: string;
    settings: {
        dailyGoal: number;
        dailyNew: number;
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
    };
}>;
export type UserCore = z.infer<typeof UserCoreSchema>;
export declare const UserTimestampSchema: z.ZodObject<{
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strip", z.ZodTypeAny, {
    createdAt: Date;
    updatedAt: Date;
}, {
    createdAt?: unknown;
    updatedAt?: unknown;
}>;
export type UserTimestamp = z.infer<typeof UserTimestampSchema>;
export declare const UserMetaSchema: z.ZodObject<{
    id: z.ZodString;
    league: z.ZodDefault<z.ZodNumber>;
    currentGroupId: z.ZodString;
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
    }, "strict", z.ZodTypeAny, {
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
    profileCompleted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    interests: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    id: string;
    league: number;
    currentGroupId: string;
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
}, {
    id: string;
    currentGroupId: string;
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
    league?: number | undefined;
    experiencePoints?: number | undefined;
    currencyCount?: number | undefined;
    followingCount?: number | undefined;
    followersCount?: number | undefined;
    profileCompleted?: boolean | undefined;
    interests?: string[] | undefined;
}>;
export type UserMeta = z.infer<typeof UserMetaSchema>;
export declare const UserSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    settings: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
        dailyGoal: z.ZodNumber;
        dailyNew: z.ZodNumber;
        language: z.ZodDefault<z.ZodString>;
        timeZone: z.ZodDefault<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        dailyNew: number;
        language: string;
        timeZone: string;
    }, {
        dailyGoal: number;
        dailyNew: number;
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
    }>;
} & {
    id: z.ZodString;
    league: z.ZodDefault<z.ZodNumber>;
    currentGroupId: z.ZodString;
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
    }, "strict", z.ZodTypeAny, {
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
    profileCompleted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    interests: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
} & {
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    username: string;
    email: string;
    settings: {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        dailyNew: number;
        language: string;
        timeZone: string;
    };
    createdAt: Date;
    updatedAt: Date;
    id: string;
    league: number;
    currentGroupId: string;
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
}, {
    username: string;
    email: string;
    settings: {
        dailyGoal: number;
        dailyNew: number;
        theme?: "light" | "dark" | undefined;
        notificationsEnabled?: boolean | undefined;
        language?: string | undefined;
        timeZone?: string | undefined;
    };
    id: string;
    currentGroupId: string;
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
    profileCompleted?: boolean | undefined;
    interests?: string[] | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const FollowingSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const FollowingArraySchema: z.ZodArray<z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>, "many">;
export type Following = z.infer<typeof FollowingSchema>;
export declare const FollowersSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const FollowersArraySchema: z.ZodArray<z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>, "many">;
export type Followers = z.infer<typeof FollowersSchema>;
