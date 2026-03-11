import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { NotificationSchema, type Notification, type NotificationCreate } from "memvocado-types";
import type { NotificationRepository } from "../interfaces/NotificationRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of NotificationRepository.
 * @class
 */
export class FirestoreNotificationRepository implements NotificationRepository {
  /**
   * @param {string} userId - User ID
   * @param {number} [limit] - Max notifications to return
   * @return {Promise<Notification[]>} Unread notifications
   */
  async getUnread(userId: string, limit = 50): Promise<Notification[]> {
    const snap = await db
      .collection(`users/${userId}/notifications`)
      .where("read", "==", false)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((doc) =>
      NotificationSchema.parse({ id: doc.id, ...doc.data() })
    );
  }

  /**
   * @param {string} userId - User ID
   * @param {Omit<NotificationCreate, "createdAt" | "readAt">} notification - Notification data
   * @return {Promise<string>} ID of the created notification
   */
  async create(
    userId: string,
    notification: Omit<NotificationCreate, "createdAt" | "readAt">
  ): Promise<string> {
    const ref = await db.collection(`users/${userId}/notifications`).add({
      ...notification,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} notifId - Notification ID
   * @return {Promise<void>}
   */
  async markRead(userId: string, notifId: string): Promise<void> {
    await db.doc(`users/${userId}/notifications/${notifId}`).update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });
  }
}
