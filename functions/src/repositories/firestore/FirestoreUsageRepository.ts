import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { UsageRepository } from "../interfaces/UsageRepository";

const db = getFirestore();

/**
 * Generic Firestore usage repository.
 * Tracks daily usage counters in: users/{userId}/{collectionName}/{date}
 * @class
 */
export class FirestoreUsageRepository implements UsageRepository {
  /**
   * @param {string} collectionName - e.g. "translationUsage" or "avoUsage"
   */
  constructor(private readonly collectionName: string) {}

  /**
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @return {Promise<number>} Usage count for the given date
   */
  async getUsage(userId: string, date: string): Promise<number> {
    const snap = await db.doc(`users/${userId}/${this.collectionName}/${date}`).get();
    if (!snap.exists) return 0;
    return snap.data()?.count || 0;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @return {Promise<number>} Updated usage count
   */
  async incrementUsage(userId: string, date: string): Promise<number> {
    const ref = db.doc(`users/${userId}/${this.collectionName}/${date}`);
    await ref.set(
      {
        userId,
        date,
        count: FieldValue.increment(1),
        lastUsedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    const snap = await ref.get();
    return snap.data()?.count || 1;
  }

  /**
   * @param {string} key - Admin settings key
   * @return {Promise<number>} Admin limit value
   */
  async getAdminLimit(key: string): Promise<number> {
    const snap = await db.doc("admin/settings").get();
    return (snap.data()?.[key] as number) || 0;
  }
}
