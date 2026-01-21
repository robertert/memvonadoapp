import { z } from "zod";
/**
 * Powiadomienie
 */
export declare const NotificationCreateSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodString;
    type: z.ZodEnum<["info", "success", "warning", "error"]>;
    linkTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    read: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    readAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
}, "strict", z.ZodTypeAny, {
    type: "success" | "info" | "warning" | "error";
    title: string;
    createdAt: Date;
    body: string;
    read: boolean;
    linkTo?: string | null | undefined;
    readAt?: Date | undefined;
}, {
    type: "success" | "info" | "warning" | "error";
    title: string;
    body: string;
    createdAt?: unknown;
    linkTo?: string | null | undefined;
    read?: boolean | undefined;
    readAt?: unknown;
}>;
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;
export declare const NotificationSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodString;
    type: z.ZodEnum<["info", "success", "warning", "error"]>;
    linkTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    read: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    readAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
} & {
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    type: "success" | "info" | "warning" | "error";
    id: string;
    title: string;
    createdAt: Date;
    body: string;
    read: boolean;
    linkTo?: string | null | undefined;
    readAt?: Date | undefined;
}, {
    type: "success" | "info" | "warning" | "error";
    id: string;
    title: string;
    body: string;
    createdAt?: unknown;
    linkTo?: string | null | undefined;
    read?: boolean | undefined;
    readAt?: unknown;
}>;
export type Notification = z.infer<typeof NotificationSchema>;
