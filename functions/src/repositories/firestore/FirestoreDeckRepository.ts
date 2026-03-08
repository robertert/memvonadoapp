import { getFirestore } from "firebase-admin/firestore";
import {
  DeckSchema,
  DeckLearningDataSchema,
  type Deck,
  type DeckLearningData,
} from "memvocado-types";
import type { DeckRepository } from "../interfaces/DeckRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of DeckRepository.
 */
export class FirestoreDeckRepository implements DeckRepository {
  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<DeckLearningData | null>} User deck or null
   */
  async getUserDeck(
    userId: string,
    deckId: string
  ): Promise<DeckLearningData | null> {
    const snap = await db.doc(`users/${userId}/decks/${deckId}`).get();
    if (!snap.exists) {
      return null;
    }
    return DeckLearningDataSchema.parse(snap.data());
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {DeckLearningData} data - Deck learning data
   * @return {Promise<void>}
   */
  async createUserDeck(
    userId: string,
    deckId: string,
    data: DeckLearningData
  ): Promise<void> {
    await db
      .doc(`users/${userId}/decks/${deckId}`)
      .set(DeckLearningDataSchema.parse(data));
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {Record<string, unknown>} data - Partial update data
   * @return {Promise<void>}
   */
  async updateUserDeck(
    userId: string,
    deckId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}/decks/${deckId}`).update(data);
  }

  /**
   * @param {string} deckId - Source deck ID
   * @return {Promise<Deck | null>} Source deck or null
   */
  async getSourceDeck(deckId: string): Promise<Deck | null> {
    const snap = await db.doc(`decks/${deckId}`).get();
    if (!snap.exists) return null;
    return DeckSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} deckId - Source deck ID
   * @param {Record<string, unknown>} data - Partial update data
   * @return {Promise<void>}
   */
  async updateDeck(
    deckId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`decks/${deckId}`).update(data);
  }

  /**
   * @param {string} deckId - Source deck ID
   * @return {Promise<string[]>} Array of user IDs who have a copy of this deck
   */
  async getLearnerIds(deckId: string): Promise<string[]> {
    const snap = await db
      .collectionGroup("decks")
      .where("id", "==", deckId)
      .get();
    return snap.docs.map((doc) => {
      const parent = doc.ref.parent.parent;
      return parent ? parent.id : "";
    }).filter(Boolean);
  }
}
