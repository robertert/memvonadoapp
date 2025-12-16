import { z } from "zod";
export declare const GetLeaderboardRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    seasonId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    seasonId?: string | undefined;
}, {
    userId: string;
    seasonId?: string | undefined;
}>;
export type GetLeaderboardRequest = z.infer<typeof GetLeaderboardRequestSchema>;
export declare const GetUserRankingRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    seasonId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    seasonId?: string | undefined;
}, {
    userId: string;
    seasonId?: string | undefined;
}>;
export type GetUserRankingRequest = z.infer<typeof GetUserRankingRequestSchema>;
export declare const GetFollowingRankingsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    seasonId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    seasonId?: string | undefined;
}, {
    userId: string;
    seasonId?: string | undefined;
}>;
export type GetFollowingRankingsRequest = z.infer<typeof GetFollowingRankingsRequestSchema>;
export declare const AssignUserToGroupRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    leagueNumber: z.ZodNumber;
    seasonId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    seasonId: string;
    leagueNumber: number;
    userId: string;
}, {
    seasonId: string;
    leagueNumber: number;
    userId: string;
}>;
export type AssignUserToGroupRequest = z.infer<typeof AssignUserToGroupRequestSchema>;
export declare const GetLeaderboardResponseSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        username: z.ZodString;
        points: z.ZodNumber;
        position: z.ZodNumber;
        lastActivityAt: z.ZodNullable<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strip", z.ZodTypeAny, {
        username: string;
        points: number;
        lastActivityAt: Date | null;
        userId: string;
        position: number;
    }, {
        username: string;
        points: number;
        userId: string;
        position: number;
        lastActivityAt?: unknown;
    }>, "many">;
    groupId: z.ZodNullable<z.ZodString>;
    leagueNumber: z.ZodNullable<z.ZodNumber>;
    seasonId: z.ZodString;
    totalMembers: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    entries: {
        username: string;
        points: number;
        lastActivityAt: Date | null;
        userId: string;
        position: number;
    }[];
    seasonId: string;
    groupId: string | null;
    leagueNumber: number | null;
    totalMembers: number;
}, {
    entries: {
        username: string;
        points: number;
        userId: string;
        position: number;
        lastActivityAt?: unknown;
    }[];
    seasonId: string;
    groupId: string | null;
    leagueNumber: number | null;
    totalMembers: number;
}>;
export type GetLeaderboardResponse = z.infer<typeof GetLeaderboardResponseSchema>;
export declare const GetUserRankingResponseSchema: z.ZodObject<{
    position: z.ZodNullable<z.ZodNumber>;
    groupId: z.ZodNullable<z.ZodString>;
    leagueNumber: z.ZodNullable<z.ZodNumber>;
    points: z.ZodNumber;
    totalMembers: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    points: number;
    groupId: string | null;
    leagueNumber: number | null;
    position: number | null;
    totalMembers: number | null;
}, {
    points: number;
    groupId: string | null;
    leagueNumber: number | null;
    position: number | null;
    totalMembers: number | null;
}>;
export type GetUserRankingResponse = z.infer<typeof GetUserRankingResponseSchema>;
export declare const GetFollowingRankingsResponseSchema: z.ZodObject<{
    rankings: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        username: z.ZodOptional<z.ZodString>;
        position: z.ZodNullable<z.ZodNumber>;
        points: z.ZodNumber;
        leagueNumber: z.ZodNumber;
        groupId: z.ZodOptional<z.ZodString>;
        totalMembers: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        points: number;
        leagueNumber: number;
        userId: string;
        position: number | null;
        username?: string | undefined;
        groupId?: string | undefined;
        totalMembers?: number | undefined;
    }, {
        points: number;
        leagueNumber: number;
        userId: string;
        position: number | null;
        username?: string | undefined;
        groupId?: string | undefined;
        totalMembers?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rankings: {
        points: number;
        leagueNumber: number;
        userId: string;
        position: number | null;
        username?: string | undefined;
        groupId?: string | undefined;
        totalMembers?: number | undefined;
    }[];
}, {
    rankings: {
        points: number;
        leagueNumber: number;
        userId: string;
        position: number | null;
        username?: string | undefined;
        groupId?: string | undefined;
        totalMembers?: number | undefined;
    }[];
}>;
export type GetFollowingRankingsResponse = z.infer<typeof GetFollowingRankingsResponseSchema>;
export declare const AssignUserToGroupResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    groupId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    groupId: string;
}, {
    success: boolean;
    groupId: string;
}>;
export type AssignUserToGroupResponse = z.infer<typeof AssignUserToGroupResponseSchema>;
