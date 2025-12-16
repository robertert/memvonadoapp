import { z } from "zod";
import { NotificationSchema } from "../index";

// ===========================
// Notification request schemas
// ===========================

export const GetNotificationsRequestSchema = z
  .object({
    userId: z.string(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();
export type GetNotificationsRequest = z.infer<
  typeof GetNotificationsRequestSchema
>;

export const MarkNotificationReadRequestSchema = z
  .object({
    userId: z.string(),
    notificationId: z.string(),
  })
  .strict();
export type MarkNotificationReadRequest = z.infer<
  typeof MarkNotificationReadRequestSchema
>;

export const CreateNotificationRequestSchema = z
  .object({
    userId: z.string(),
    notification: NotificationSchema.omit({
      createdAt: true,
      readAt: true,
      id: true,
    }),
  })
  .strict();
export type CreateNotificationRequest = z.infer<
  typeof CreateNotificationRequestSchema
>;

export const NotifyStreakBrokenRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();
export type NotifyStreakBrokenRequest = z.infer<
  typeof NotifyStreakBrokenRequestSchema
>;

export const NotifySeasonEndRequestSchema = z
  .object({
    userId: z.string(),
    seasonId: z.string(),
    finalPosition: z.number().int().optional(),
    leagueNumber: z.number().int().optional(),
  })
  .strict();
export type NotifySeasonEndRequest = z.infer<
  typeof NotifySeasonEndRequestSchema
>;

// ===========================
// Notification response schemas
// ===========================

export const GetNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
});
export type GetNotificationsResponse = z.infer<
  typeof GetNotificationsResponseSchema
>;

export const MarkNotificationReadResponseSchema = z.object({
  success: z.boolean(),
});
export type MarkNotificationReadResponse = z.infer<
  typeof MarkNotificationReadResponseSchema
>;

export const CreateNotificationResponseSchema = z.object({
  success: z.boolean(),
  notificationId: z.string(),
});
export type CreateNotificationResponse = z.infer<
  typeof CreateNotificationResponseSchema
>;

export const NotifyStreakBrokenResponseSchema = z.object({
  success: z.boolean(),
});
export type NotifyStreakBrokenResponse = z.infer<
  typeof NotifyStreakBrokenResponseSchema
>;

export const NotifySeasonEndResponseSchema = z.object({
  success: z.boolean(),
});
export type NotifySeasonEndResponse = z.infer<
  typeof NotifySeasonEndResponseSchema
>;
