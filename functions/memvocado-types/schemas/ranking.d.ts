import { z } from "zod";
/**
 * Sezon rankingowy
 */
export declare const SeasonCreateSchema: z.ZodObject<{
    seasonId: z.ZodString;
    startAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    endAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "inactive";
    seasonId: string;
    startAt: Date;
    endAt: Date;
}, {
    seasonId: string;
    status?: "active" | "inactive" | undefined;
    startAt?: unknown;
    endAt?: unknown;
}>;
export type SeasonCreate = z.infer<typeof SeasonCreateSchema>;
export declare const SeasonSchema: z.ZodObject<{
    seasonId: z.ZodString;
    startAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    endAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
} & {
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    status: "active" | "inactive";
    id: string;
    seasonId: string;
    startAt: Date;
    endAt: Date;
}, {
    id: string;
    seasonId: string;
    status?: "active" | "inactive" | undefined;
    startAt?: unknown;
    endAt?: unknown;
}>;
export type Season = z.infer<typeof SeasonSchema>;
/**
 * Punkty użytkownika w sezonie
 */
export declare const SeasonUserPointsSchema: z.ZodObject<{
    points: z.ZodNumber;
    league: z.ZodNumber;
    groupId: z.ZodOptional<z.ZodString>;
    lastActivityAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    league: number;
    points: number;
    lastActivityAt: Date;
    groupId?: string | undefined;
}, {
    league: number;
    points: number;
    groupId?: string | undefined;
    lastActivityAt?: unknown;
}>;
export type SeasonUserPoints = z.infer<typeof SeasonUserPointsSchema>;
/**
 * Grupa ligowa
 */
export declare const LeagueGroupSchema: z.ZodObject<{
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    isFull: z.ZodBoolean;
    capacity: z.ZodDefault<z.ZodNumber>;
    currentCount: z.ZodNumber;
    id: z.ZodString;
    leagueNumber: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    createdAt: Date;
    id: string;
    isFull: boolean;
    capacity: number;
    currentCount: number;
    leagueNumber: number;
}, {
    id: string;
    isFull: boolean;
    currentCount: number;
    leagueNumber: number;
    createdAt?: unknown;
    capacity?: number | undefined;
}>;
export type LeagueGroup = z.infer<typeof LeagueGroupSchema>;
/**
 * Członek grupy ligowej
 */
export declare const LeagueGroupMemberSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    points: z.ZodNumber;
    lastActivityAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    username: string;
    id: string;
    points: number;
    lastActivityAt: Date;
}, {
    username: string;
    id: string;
    points: number;
    lastActivityAt?: unknown;
}>;
export type LeagueGroupMember = z.infer<typeof LeagueGroupMemberSchema>;
