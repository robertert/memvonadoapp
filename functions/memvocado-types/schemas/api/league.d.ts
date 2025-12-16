import { z } from "zod";
export declare const GetLeagueInfoRequestSchema: z.ZodObject<{
    leagueNumber: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    leagueNumber: number;
}, {
    leagueNumber: number;
}>;
export type GetLeagueInfoRequest = z.infer<typeof GetLeagueInfoRequestSchema>;
export declare const GetUserGroupRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    seasonId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    seasonId?: string | undefined;
}, {
    userId: string;
    seasonId?: string | undefined;
}>;
export type GetUserGroupRequest = z.infer<typeof GetUserGroupRequestSchema>;
export declare const UpdateUserLeagueRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    newLeague: z.ZodNumber;
    seasonId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    newLeague: number;
    seasonId?: string | undefined;
}, {
    userId: string;
    newLeague: number;
    seasonId?: string | undefined;
}>;
export type UpdateUserLeagueRequest = z.infer<typeof UpdateUserLeagueRequestSchema>;
export declare const GetLeagueInfoResponseSchema: z.ZodObject<{
    league: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        color: string;
        description: string;
    }, {
        id: number;
        name: string;
        color: string;
        description: string;
    }>;
}, "strip", z.ZodTypeAny, {
    league: {
        id: number;
        name: string;
        color: string;
        description: string;
    };
}, {
    league: {
        id: number;
        name: string;
        color: string;
        description: string;
    };
}>;
export type GetLeagueInfoResponse = z.infer<typeof GetLeagueInfoResponseSchema>;
export declare const GetAllLeaguesInfoResponseSchema: z.ZodObject<{
    leagues: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        color: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        color: string;
        description: string;
    }, {
        id: number;
        name: string;
        color: string;
        description: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    leagues: {
        id: number;
        name: string;
        color: string;
        description: string;
    }[];
}, {
    leagues: {
        id: number;
        name: string;
        color: string;
        description: string;
    }[];
}>;
export type GetAllLeaguesInfoResponse = z.infer<typeof GetAllLeaguesInfoResponseSchema>;
export declare const GetUserGroupResponseSchema: z.ZodObject<{
    groupId: z.ZodNullable<z.ZodString>;
    leagueNumber: z.ZodNullable<z.ZodNumber>;
    memberCount: z.ZodNumber;
    capacity: z.ZodNumber;
    isFull: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    groupId: string | null;
    isFull: boolean;
    capacity: number;
    leagueNumber: number | null;
    memberCount: number;
}, {
    groupId: string | null;
    isFull: boolean;
    capacity: number;
    leagueNumber: number | null;
    memberCount: number;
}>;
export type GetUserGroupResponse = z.infer<typeof GetUserGroupResponseSchema>;
