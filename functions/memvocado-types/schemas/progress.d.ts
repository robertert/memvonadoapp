import { z } from "zod";
/**
 * Postęp użytkownika
 */
export declare const UserProgressSchema: z.ZodObject<{
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
export type UserProgress = z.infer<typeof UserProgressSchema>;
