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
export type UserStats = z.infer<typeof UserStatsSchema>;
/**
 * Ustawienia użytkownika
 */
export declare const UserSettingsSchema: z.ZodObject<{
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
}, "strict", z.ZodTypeAny, {
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
}, {
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
export declare const UserDailyStatsSchema: z.ZodObject<{
    completedNewToday: z.ZodNumber;
    completedDueToday: z.ZodNumber;
    lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strip", z.ZodTypeAny, {
    completedNewToday: number;
    completedDueToday: number;
    lastUpdatedStats: Date;
}, {
    completedNewToday: number;
    completedDueToday: number;
    lastUpdatedStats?: unknown;
}>;
export type UserDailyStats = z.infer<typeof UserDailyStatsSchema>;
export declare const UserMetaSchema: z.ZodObject<{
    id: z.ZodString;
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
    avocadoGrowth: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        currentPhase: z.ZodDefault<z.ZodNumber>;
        consecutiveDays: z.ZodDefault<z.ZodNumber>;
        lastGrowthDate: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
        totalHarvests: z.ZodDefault<z.ZodNumber>;
        collectedSkins: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            rarity: z.ZodEnum<["common", "rare", "epic"]>;
            obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt: Date;
        }, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }>, "many">>;
        harvestHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
            skinId: z.ZodString;
            harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            skinId: string;
            harvestedAt: Date;
        }, {
            skinId: string;
            harvestedAt?: unknown;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
        currentPhase?: number | undefined;
        consecutiveDays?: number | undefined;
        lastGrowthDate?: unknown;
        totalHarvests?: number | undefined;
        collectedSkins?: {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }[] | undefined;
        harvestHistory?: {
            skinId: string;
            harvestedAt?: unknown;
        }[] | undefined;
    }>>>;
    dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>>;
    followingCount: z.ZodDefault<z.ZodNumber>;
    followersCount: z.ZodDefault<z.ZodNumber>;
    profileCompleted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    interests: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
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
}, {
    id: string;
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
    dailyStats?: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | null | undefined;
    league?: number | undefined;
    experiencePoints?: number | undefined;
    currencyCount?: number | undefined;
    avocadoGrowth?: {
        currentPhase?: number | undefined;
        consecutiveDays?: number | undefined;
        lastGrowthDate?: unknown;
        totalHarvests?: number | undefined;
        collectedSkins?: {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }[] | undefined;
        harvestHistory?: {
            skinId: string;
            harvestedAt?: unknown;
        }[] | undefined;
    } | null | undefined;
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
} & {
    id: z.ZodString;
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
    avocadoGrowth: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        currentPhase: z.ZodDefault<z.ZodNumber>;
        consecutiveDays: z.ZodDefault<z.ZodNumber>;
        lastGrowthDate: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
        totalHarvests: z.ZodDefault<z.ZodNumber>;
        collectedSkins: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            rarity: z.ZodEnum<["common", "rare", "epic"]>;
            obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt: Date;
        }, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }>, "many">>;
        harvestHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
            skinId: z.ZodString;
            harvestedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            skinId: string;
            harvestedAt: Date;
        }, {
            skinId: string;
            harvestedAt?: unknown;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
        currentPhase?: number | undefined;
        consecutiveDays?: number | undefined;
        lastGrowthDate?: unknown;
        totalHarvests?: number | undefined;
        collectedSkins?: {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }[] | undefined;
        harvestHistory?: {
            skinId: string;
            harvestedAt?: unknown;
        }[] | undefined;
    }>>>;
    dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>>;
    followingCount: z.ZodDefault<z.ZodNumber>;
    followersCount: z.ZodDefault<z.ZodNumber>;
    profileCompleted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    interests: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
} & {
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
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
}, {
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
    dailyStats?: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | null | undefined;
    league?: number | undefined;
    experiencePoints?: number | undefined;
    currencyCount?: number | undefined;
    avocadoGrowth?: {
        currentPhase?: number | undefined;
        consecutiveDays?: number | undefined;
        lastGrowthDate?: unknown;
        totalHarvests?: number | undefined;
        collectedSkins?: {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic";
            obtainedAt?: unknown;
        }[] | undefined;
        harvestHistory?: {
            skinId: string;
            harvestedAt?: unknown;
        }[] | undefined;
    } | null | undefined;
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
