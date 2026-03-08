import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  UserSchema,
  StudySessionCreateSchema,
  type User,
  type StudySessionCreate,
} from "memvocado-types";
import type { UserRepository } from "../interfaces/UserRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of UserRepository.
 */
export class FirestoreUserRepository implements UserRepository {
  /**
   * @param {string} userId - User ID
   * @return {Promise<User | null>} User or null
   */
  async getUser(userId: string): Promise<User | null> {
    const snap = await db.doc(`users/${userId}`).get();
    if (!snap.exists) {
      return null;
    }
    return UserSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} userId - User ID
   * @param {Record<string, unknown>} data - Partial update data
   * @return {Promise<void>}
   */
  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}`).update(data);
  }

  /**
   * @param {string} userId - User ID
   * @param {string} field - Dot-notation field path
   * @param {number} amount - Amount to increment by
   * @return {Promise<void>}
   */
  async incrementField(
    userId: string,
    field: string,
    amount: number
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      [field]: FieldValue.increment(amount),
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {StudySessionCreate} session - Study session data
   * @return {Promise<string>} New document ID
   */
  async addStudySession(
    userId: string,
    session: StudySessionCreate
  ): Promise<string> {
    const validated = StudySessionCreateSchema.parse(session);
    const doc = await db
      .collection(`users/${userId}/studySessions`)
      .add(validated);
    return doc.id;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} cardId - Card ID to match
   * @return {Promise<void>}
   */
  async deleteLatestStudySession(userId: string, cardId: string): Promise<void> {
    const snap = await db
      .collection(`users/${userId}/studySessions`)
      .where("cardId", "==", cardId)
      .limit(1)
      .get();
    if (snap.docs.length > 0) {
      await snap.docs[0].ref.delete();
    }
  }
}
