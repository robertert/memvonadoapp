import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Powiadomienie
 */
export const NotificationCreateSchema = z
  .object({
    title: z.string(),
    body: z.string(),
    type: z.enum(["info", "success", "warning", "error"]),
    linkTo: z.string().optional(),
    read: z.boolean().default(false),
    createdAt: TimestampSchema,
    readAt: TimestampSchema.optional(),
  })
  .strict();

export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;

export const NotificationSchema = NotificationCreateSchema.extend({
  id: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;
