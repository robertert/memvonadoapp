import { z } from "zod";
export declare const GetNotificationsRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    limit?: number | undefined;
}, {
    userId: string;
    limit?: number | undefined;
}>;
export type GetNotificationsRequest = z.infer<typeof GetNotificationsRequestSchema>;
export declare const MarkNotificationReadRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    notificationId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
    notificationId: string;
}, {
    userId: string;
    notificationId: string;
}>;
export type MarkNotificationReadRequest = z.infer<typeof MarkNotificationReadRequestSchema>;
export declare const CreateNotificationRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    notification: z.ZodObject<Omit<{
        title: z.ZodString;
        body: z.ZodString;
        type: z.ZodEnum<["info", "success", "warning", "error"]>;
        linkTo: z.ZodOptional<z.ZodString>;
        read: z.ZodDefault<z.ZodBoolean>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        readAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    } & {
        id: z.ZodString;
    }, "createdAt" | "id" | "readAt">, "strict", z.ZodTypeAny, {
        type: "info" | "success" | "warning" | "error";
        title: string;
        body: string;
        read: boolean;
        linkTo?: string | undefined;
    }, {
        type: "info" | "success" | "warning" | "error";
        title: string;
        body: string;
        linkTo?: string | undefined;
        read?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    userId: string;
    notification: {
        type: "info" | "success" | "warning" | "error";
        title: string;
        body: string;
        read: boolean;
        linkTo?: string | undefined;
    };
}, {
    userId: string;
    notification: {
        type: "info" | "success" | "warning" | "error";
        title: string;
        body: string;
        linkTo?: string | undefined;
        read?: boolean | undefined;
    };
}>;
export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>;
export declare const NotifyStreakBrokenRequestSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type NotifyStreakBrokenRequest = z.infer<typeof NotifyStreakBrokenRequestSchema>;
export declare const NotifySeasonEndRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    seasonId: z.ZodString;
    finalPosition: z.ZodOptional<z.ZodNumber>;
    leagueNumber: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    seasonId: string;
    userId: string;
    leagueNumber?: number | undefined;
    finalPosition?: number | undefined;
}, {
    seasonId: string;
    userId: string;
    leagueNumber?: number | undefined;
    finalPosition?: number | undefined;
}>;
export type NotifySeasonEndRequest = z.infer<typeof NotifySeasonEndRequestSchema>;
export declare const GetNotificationsResponseSchema: z.ZodObject<{
    notifications: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodString;
        type: z.ZodEnum<["info", "success", "warning", "error"]>;
        linkTo: z.ZodOptional<z.ZodString>;
        read: z.ZodDefault<z.ZodBoolean>;
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        readAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    } & {
        id: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        type: "info" | "success" | "warning" | "error";
        createdAt: Date;
        id: string;
        title: string;
        body: string;
        read: boolean;
        linkTo?: string | undefined;
        readAt?: Date | undefined;
    }, {
        type: "info" | "success" | "warning" | "error";
        id: string;
        title: string;
        body: string;
        createdAt?: unknown;
        linkTo?: string | undefined;
        read?: boolean | undefined;
        readAt?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    notifications: {
        type: "info" | "success" | "warning" | "error";
        createdAt: Date;
        id: string;
        title: string;
        body: string;
        read: boolean;
        linkTo?: string | undefined;
        readAt?: Date | undefined;
    }[];
}, {
    notifications: {
        type: "info" | "success" | "warning" | "error";
        id: string;
        title: string;
        body: string;
        createdAt?: unknown;
        linkTo?: string | undefined;
        read?: boolean | undefined;
        readAt?: unknown;
    }[];
}>;
export type GetNotificationsResponse = z.infer<typeof GetNotificationsResponseSchema>;
export declare const MarkNotificationReadResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type MarkNotificationReadResponse = z.infer<typeof MarkNotificationReadResponseSchema>;
export declare const CreateNotificationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    notificationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    notificationId: string;
}, {
    success: boolean;
    notificationId: string;
}>;
export type CreateNotificationResponse = z.infer<typeof CreateNotificationResponseSchema>;
export declare const NotifyStreakBrokenResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type NotifyStreakBrokenResponse = z.infer<typeof NotifyStreakBrokenResponseSchema>;
export declare const NotifySeasonEndResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type NotifySeasonEndResponse = z.infer<typeof NotifySeasonEndResponseSchema>;
