import { z } from "zod";
export declare const UpdateUserStreakIfQualifiedRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type UpdateUserStreakIfQualifiedRequest = z.infer<typeof UpdateUserStreakIfQualifiedRequestSchema>;
export declare const UpdateUserStreakOnLoginRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type UpdateUserStreakOnLoginRequest = z.infer<typeof UpdateUserStreakOnLoginRequestSchema>;
export declare const GetUserDecksRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetUserDecksRequest = z.infer<typeof GetUserDecksRequestSchema>;
export declare const UpdateCardProgressRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    deckId: z.ZodString;
    card: z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        tags?: string[] | undefined;
        createdAt?: unknown;
        updatedAt?: unknown;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>;
    scheduledTime: z.ZodNumber;
    dailyStats: z.ZodOptional<z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    userId: string;
    card: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    };
    scheduledTime: number;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | undefined;
}, {
    deckId: string;
    userId: string;
    card: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        tags?: string[] | undefined;
        createdAt?: unknown;
        updatedAt?: unknown;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    };
    scheduledTime: number;
    dailyStats?: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | undefined;
}>;
export type UpdateCardProgressRequest = z.infer<typeof UpdateCardProgressRequestSchema>;
export declare const GetUserProgressRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetUserProgressRequest = z.infer<typeof GetUserProgressRequestSchema>;
export declare const UndoCardRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    card: z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        tags?: string[] | undefined;
        createdAt?: unknown;
        updatedAt?: unknown;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>;
    dailyStats: z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>;
}, "strict", z.ZodTypeAny, {
    dailyStats: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    };
    deckId: string;
    card: {
        id: string;
        tags: string[];
        createdAt: Date;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    };
}, {
    dailyStats: {
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    };
    deckId: string;
    card: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        tags?: string[] | undefined;
        createdAt?: unknown;
        updatedAt?: unknown;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    };
}>;
export type UndoCardRequest = z.infer<typeof UndoCardRequestSchema>;
export declare const GetUserSettingsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetUserSettingsRequest = z.infer<typeof GetUserSettingsRequestSchema>;
export declare const GetUserProfileRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetUserProfileRequest = z.infer<typeof GetUserProfileRequestSchema>;
export declare const GetUserActivityHeatmapRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    weeks: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    weeks?: number | undefined;
}, {
    userId: string;
    weeks?: number | undefined;
}>;
export type GetUserActivityHeatmapRequest = z.infer<typeof GetUserActivityHeatmapRequestSchema>;
export declare const GetUserAwardsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetUserAwardsRequest = z.infer<typeof GetUserAwardsRequestSchema>;
export declare const SubmitPointsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    delta: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    userId: string;
    delta: number;
}, {
    userId: string;
    delta: number;
}>;
export type SubmitPointsRequest = z.infer<typeof SubmitPointsRequestSchema>;
export declare const UpdateUserSettingsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
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
    userId: string;
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
    userId: string;
}>;
export type UpdateUserSettingsRequest = z.infer<typeof UpdateUserSettingsRequestSchema>;
export declare const UpdateUserStreakIfQualifiedResponseSchema: z.ZodObject<{
    qualified: z.ZodBoolean;
    currentStreak: z.ZodNumber;
    longestStreak: z.ZodNumber;
    lastStreakDate: z.ZodNullable<z.ZodString>;
    threshold: z.ZodNumber;
    todayCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    updated: z.ZodBoolean;
    avocadoGrew: z.ZodOptional<z.ZodBoolean>;
    avocadoPreviousPhase: z.ZodOptional<z.ZodNumber>;
    avocadoCurrentPhase: z.ZodOptional<z.ZodNumber>;
    avocadoConsecutiveDays: z.ZodOptional<z.ZodNumber>;
    avocadoCanHarvest: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export type UpdateUserStreakIfQualifiedResponse = z.infer<typeof UpdateUserStreakIfQualifiedResponseSchema>;
export declare const UpdateUserStreakOnLoginResponseSchema: z.ZodObject<{
    currentStreak: z.ZodNumber;
    longestStreak: z.ZodOptional<z.ZodNumber>;
    previousStreak: z.ZodOptional<z.ZodNumber>;
    lastStreakDate: z.ZodOptional<z.ZodString>;
    updated: z.ZodBoolean;
    status: z.ZodEnum<["streak_safe", "streak_reset"]>;
}, "strip", z.ZodTypeAny, {
    status: "streak_safe" | "streak_reset";
    currentStreak: number;
    updated: boolean;
    longestStreak?: number | undefined;
    lastStreakDate?: string | undefined;
    previousStreak?: number | undefined;
}, {
    status: "streak_safe" | "streak_reset";
    currentStreak: number;
    updated: boolean;
    longestStreak?: number | undefined;
    lastStreakDate?: string | undefined;
    previousStreak?: number | undefined;
}>;
export type UpdateUserStreakOnLoginResponse = z.infer<typeof UpdateUserStreakOnLoginResponseSchema>;
export declare const GetUserProgressResponseSchema: z.ZodObject<{
    userProgress: z.ZodObject<{
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
        dailyGoal: z.ZodDefault<z.ZodNumber>;
        recentSessions: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strict", z.ZodTypeAny, {
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
    }, {
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
        dailyGoal?: number | undefined;
        recentSessions?: any[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
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
}, {
    userProgress: {
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
        dailyGoal?: number | undefined;
        recentSessions?: any[] | undefined;
    };
}>;
export type GetUserProgressResponse = z.infer<typeof GetUserProgressResponseSchema>;
export declare const GetUserSettingsResponseSchema: z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    settings: {
        theme: "light" | "dark";
        notificationsEnabled: boolean;
        dailyGoal: number;
        language: string;
        timeZone: string;
        dailyNew?: number | undefined;
        defaultLearningMode?: "srs" | "all_in_one" | undefined;
    };
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
}>;
export type GetUserSettingsResponse = z.infer<typeof GetUserSettingsResponseSchema>;
export declare const GetUserProfileResponseSchema: z.ZodObject<{
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
            rarity: z.ZodEnum<["common", "rare", "epic", "legendary"]>;
            obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic" | "legendary";
            obtainedAt: Date;
        }, {
            id: string;
            name: string;
            rarity: "common" | "rare" | "epic" | "legendary";
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
            rarity: "common" | "rare" | "epic" | "legendary";
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
            rarity: "common" | "rare" | "epic" | "legendary";
            obtainedAt?: unknown;
        }[] | undefined;
        harvestHistory?: {
            skinId: string;
            harvestedAt?: unknown;
        }[] | undefined;
    }>>>;
    dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        completedNewToday: z.ZodDefault<z.ZodNumber>;
        completedDueToday: z.ZodDefault<z.ZodNumber>;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        completedNewToday?: number | undefined;
        completedDueToday?: number | undefined;
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
            rarity: "common" | "rare" | "epic" | "legendary";
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
        completedNewToday?: number | undefined;
        completedDueToday?: number | undefined;
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
            rarity: "common" | "rare" | "epic" | "legendary";
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
export type GetUserProfileResponse = z.infer<typeof GetUserProfileResponseSchema>;
export declare const GetUserActivityHeatmapResponseSchema: z.ZodObject<{
    heatmapData: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        count: number;
    }, {
        date: string;
        count: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    heatmapData: {
        date: string;
        count: number;
    }[];
}, {
    heatmapData: {
        date: string;
        count: number;
    }[];
}>;
export type GetUserActivityHeatmapResponse = z.infer<typeof GetUserActivityHeatmapResponseSchema>;
export declare const GetUserAwardsResponseSchema: z.ZodObject<{
    awards: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    awards: any[];
}, {
    awards: any[];
}>;
export type GetUserAwardsResponse = z.infer<typeof GetUserAwardsResponseSchema>;
export declare const ServerNowSchema: z.ZodObject<{
    nowMs: z.ZodNumber;
    iso: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nowMs: number;
    iso: string;
}, {
    nowMs: number;
    iso: string;
}>;
export type ServerNow = z.infer<typeof ServerNowSchema>;
export declare const GetCurrentSeasonResponseSchema: z.ZodObject<{
    seasonId: z.ZodString;
    startAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    endAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    status: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    seasonId: string;
    startAt: Date;
    endAt: Date;
}, {
    status: string;
    seasonId: string;
    startAt?: unknown;
    endAt?: unknown;
}>;
export type GetCurrentSeasonResponse = z.infer<typeof GetCurrentSeasonResponseSchema>;
export declare const SubmitPointsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type SubmitPointsResponse = z.infer<typeof SubmitPointsResponseSchema>;
export declare const WeeklyRollOverResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    nextSeasonId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    nextSeasonId: string;
}, {
    success: boolean;
    nextSeasonId: string;
}>;
export type WeeklyRollOverResponse = z.infer<typeof WeeklyRollOverResponseSchema>;
export declare const UndoCardResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type UndoCardResponse = z.infer<typeof UndoCardResponseSchema>;
export declare const UpdateCardProgressAllInOneRequestSchema: z.ZodObject<{
    isIncrement: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isIncrement: boolean;
}, {
    isIncrement: boolean;
}>;
export type UpdateCardProgressAllInOneRequest = z.infer<typeof UpdateCardProgressAllInOneRequestSchema>;
export declare const UpdateCardProgressAllInOneResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type UpdateCardProgressAllInOneResponse = z.infer<typeof UpdateCardProgressAllInOneResponseSchema>;
export declare const GetUserByUsernameRequestSchema: z.ZodObject<{
    username: z.ZodString;
}, "strict", z.ZodTypeAny, {
    username: string;
}, {
    username: string;
}>;
export type GetUserByUsernameRequest = z.infer<typeof GetUserByUsernameRequestSchema>;
export declare const GetUserByUsernameResponseSchema: z.ZodObject<{
    exists: z.ZodBoolean;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    exists: boolean;
    userId?: string | undefined;
}, {
    exists: boolean;
    userId?: string | undefined;
}>;
export type GetUserByUsernameResponse = z.infer<typeof GetUserByUsernameResponseSchema>;
export declare const GetPublicUserProfileRequestSchema: z.ZodObject<{
    targetUserId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    targetUserId: string;
}, {
    targetUserId: string;
}>;
export type GetPublicUserProfileRequest = z.infer<typeof GetPublicUserProfileRequestSchema>;
export declare const GetPublicUserProfileResponseSchema: z.ZodObject<{
    user: z.ZodObject<{
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
                rarity: z.ZodEnum<["common", "rare", "epic", "legendary"]>;
                obtainedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                rarity: "common" | "rare" | "epic" | "legendary";
                obtainedAt: Date;
            }, {
                id: string;
                name: string;
                rarity: "common" | "rare" | "epic" | "legendary";
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
                rarity: "common" | "rare" | "epic" | "legendary";
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
                rarity: "common" | "rare" | "epic" | "legendary";
                obtainedAt?: unknown;
            }[] | undefined;
            harvestHistory?: {
                skinId: string;
                harvestedAt?: unknown;
            }[] | undefined;
        }>>>;
        dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            completedNewToday: z.ZodDefault<z.ZodNumber>;
            completedDueToday: z.ZodDefault<z.ZodNumber>;
            lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strip", z.ZodTypeAny, {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
        }, {
            completedNewToday?: number | undefined;
            completedDueToday?: number | undefined;
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
                rarity: "common" | "rare" | "epic" | "legendary";
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
            completedNewToday?: number | undefined;
            completedDueToday?: number | undefined;
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
                rarity: "common" | "rare" | "epic" | "legendary";
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
    isFollowing: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
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
                rarity: "common" | "rare" | "epic" | "legendary";
                obtainedAt: Date;
            }[];
            harvestHistory: {
                skinId: string;
                harvestedAt: Date;
            }[];
            lastGrowthDate?: Date | null | undefined;
        } | null | undefined;
        profileCompleted?: boolean | undefined;
    };
    isFollowing: boolean;
}, {
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
        dailyStats?: {
            completedNewToday?: number | undefined;
            completedDueToday?: number | undefined;
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
                rarity: "common" | "rare" | "epic" | "legendary";
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
    };
    isFollowing: boolean;
}>;
export type GetPublicUserProfileResponse = z.infer<typeof GetPublicUserProfileResponseSchema>;
export declare const ToggleFollowRequestSchema: z.ZodObject<{
    targetUserId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    targetUserId: string;
}, {
    targetUserId: string;
}>;
export type ToggleFollowRequest = z.infer<typeof ToggleFollowRequestSchema>;
export declare const ToggleFollowResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    isFollowing: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    isFollowing: boolean;
}, {
    success: boolean;
    isFollowing: boolean;
}>;
export type ToggleFollowResponse = z.infer<typeof ToggleFollowResponseSchema>;
export declare const IsCurrentUserAdminResponseSchema: z.ZodObject<{
    isAdmin: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isAdmin: boolean;
}, {
    isAdmin: boolean;
}>;
export type IsCurrentUserAdminResponse = z.infer<typeof IsCurrentUserAdminResponseSchema>;
