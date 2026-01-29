import { z } from "zod";
export * from "./api/auth";
export * from "./api/deck";
export * from "./api/league";
export * from "./api/placeholder";
export * from "./api/ranking";
export * from "./api/notification";
export * from "./api/search";
export * from "./api/user";
export * from "./api/translation";
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
}, {
    success: boolean;
    message?: string | undefined;
}>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export declare const GetFriendsStreaksRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type GetFriendsStreaksRequest = z.infer<typeof GetFriendsStreaksRequestSchema>;
export declare const GetFriendsStreaksResponseSchema: z.ZodObject<{
    friendsStreaks: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        name: z.ZodString;
        streak: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        userId: string;
        streak: number;
    }, {
        name: string;
        userId: string;
        streak: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    friendsStreaks: {
        name: string;
        userId: string;
        streak: number;
    }[];
}, {
    friendsStreaks: {
        name: string;
        userId: string;
        streak: number;
    }[];
}>;
export type GetFriendsStreaksResponse = z.infer<typeof GetFriendsStreaksResponseSchema>;
