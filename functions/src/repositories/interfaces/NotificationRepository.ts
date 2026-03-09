import type { Notification, NotificationCreate } from "memvocado-types";

export interface NotificationRepository {
  /** Get unread notifications for a user, ordered by createdAt desc */
  getUnread(userId: string, limit?: number): Promise<Notification[]>;

  /** Create a notification document and return its ID */
  create(userId: string, notification: Omit<NotificationCreate, "createdAt" | "readAt">): Promise<string>;

  /** Mark a notification as read */
  markRead(userId: string, notifId: string): Promise<void>;
}
