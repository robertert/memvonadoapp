import { z } from "zod";
export * from "./api/auth";
export * from "./api/deck";
export * from "./api/league";
export * from "./api/placeholder";
export * from "./api/ranking";
export * from "./api/notification";
export * from "./api/search";
export * from "./api/user";
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
export declare const GetFriendsStreaksResponseSchema: z.ZodObject<{
    friendsStreaks: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        name: z.ZodString;
        streak: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        name: string;
        streak: number;
    }, {
        userId: string;
        name: string;
        streak: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    friendsStreaks: {
        userId: string;
        name: string;
        streak: number;
    }[];
}, {
    friendsStreaks: {
        userId: string;
        name: string;
        streak: number;
    }[];
}>;
export type GetFriendsStreaksResponse = z.infer<typeof GetFriendsStreaksResponseSchema>;
