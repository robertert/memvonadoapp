import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  DeckSchema,
  DeckLearningDataSchema,
  CardSchema,
  type Deck,
  type DeckLearningData,
} from "memvocado-types";
import * as logger from "firebase-functions/logger";
import type { DeckRepository } from "../interfaces/DeckRepository";
import { normalizeCardData } from "../../utils/cardUtils";

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
   * @param {number} limit - Max number of decks to return
   * @return {Promise<Deck[]>} Popular public decks ordered by views
   */
  async getPopularDecks(limit: number): Promise<Deck[]> {
    const snap = await db.collection("decks")
      .where("isPublic", "==", true)
      .where("is_deleted", "==", false)
      .orderBy("views", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => DeckSchema.parse({ ...doc.data(), id: doc.id }));
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

  // ── New methods ─────────────────────────────────────────────────────────

  /**
   * @param {Deck} deck - Deck to create
   * @return {Promise<string>} ID of the created deck
   */
  async createSourceDeck(deck: Deck): Promise<string> {
    const deckRef = db.collection("decks").doc();
    const validated = DeckSchema.parse({ ...deck, id: deckRef.id });
    await deckRef.set(validated);
    return deckRef.id;
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {object[]} cards - Cards to create
   * @return {Promise<string[]>} IDs of the created cards
   */
  async bulkCreateSourceCards(
    deckId: string,
    cards: Array<{ cardData: { front: string; back: string }; tags?: string[] }>
  ): Promise<string[]> {
    if (cards.length === 0) return [];

    const deckRef = db.collection("decks").doc(deckId);
    const now = new Date();
    const ids: string[] = [];
    const CHUNK = 499;

    let batch = db.batch();
    let count = 0;

    for (const c of cards) {
      const cardRef = deckRef.collection("cards").doc();
      ids.push(cardRef.id);
      const card = CardSchema.parse({
        id: cardRef.id,
        cardData: normalizeCardData({
          front: c.cardData.front || "",
          back: c.cardData.back || "",
        }),
        tags: c.tags || [],
        createdAt: now,
        firstLearn: { isNew: true },
      });
      batch.set(cardRef, card);
      count++;
      if (count >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    return ids;
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {Record<string, unknown>} updateData - Data to update
   * @return {Promise<void>}
   */
  async syncUserCopiesMetadata(
    deckId: string,
    updateData: Record<string, unknown>
  ): Promise<void> {
    let userDeckCopies;
    try {
      userDeckCopies = await db
        .collectionGroup("decks")
        .where("id", "==", deckId)
        .get();
    } catch (queryError) {
      if (queryError instanceof Error && queryError.message.includes("index")) {
        logger.error(
          "Collection group query requires index for collectionGroup 'decks' with field 'id'",
          { deckId, error: queryError.message }
        );
      } else {
        logger.error("Error executing collection group query", {
          deckId,
          error: queryError instanceof Error ? queryError.message : String(queryError),
        });
      }
      return;
    }

    if (userDeckCopies.empty) {
      logger.info("No user copies found for deck", { deckId });
      return;
    }

    const payload = {
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const CHUNK = 499;
    let batch = db.batch();
    let count = 0;
    let updatedCount = 0;

    for (const doc of userDeckCopies.docs) {
      const parts = doc.ref.path.split("/");
      if (parts.length !== 4 || parts[0] !== "users") {
        logger.warn("Invalid path structure in collection group query", { path: doc.ref.path });
        continue;
      }
      if (parts[3] !== deckId) {
        logger.warn("Deck ID mismatch in collectionGroup result", { path: doc.ref.path });
        continue;
      }

      const existing = doc.data();
      if (!existing) continue;

      try {
        const validated = DeckLearningDataSchema.parse({ ...existing, id: parts[3] });
        if (validated.id !== deckId) continue;
      } catch {
        logger.warn("Invalid user deck data, skipping", { path: doc.ref.path });
        continue;
      }

      batch.update(doc.ref, payload);
      updatedCount++;
      count++;
      if (count >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
    logger.info("Synced deck metadata to user copies", { deckId, updatedCount });
  }

  /**
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async softDeleteDeck(deckId: string): Promise<void> {
    await db.doc(`decks/${deckId}`).update({
      is_deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {string} userId - User ID
   * @return {Promise<void>}
   */
  async recordView(deckId: string, userId: string): Promise<void> {
    const viewerRef = db.doc(`decks/${deckId}/viewers/${userId}`);
    const deckRef = db.doc(`decks/${deckId}`);

    await db.runTransaction(async (tx) => {
      const deckSnap = await tx.get(deckRef);
      if (!deckSnap.exists) throw new Error("not-found");
      tx.set(viewerRef, { viewedAt: FieldValue.serverTimestamp() });
      tx.update(deckRef, { views: FieldValue.increment(1) });
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<object>}
   */
  async toggleLike(
    userId: string,
    deckId: string
  ): Promise<{
    liked: boolean;
    newLikeCount: number;
    deckCreatorId: string | null;
    deckTitle: string | null;
  }> {
    const likedDeckRef = db.doc(`users/${userId}/likedDecks/${deckId}`);
    const deckRef = db.doc(`decks/${deckId}`);

    const likedSnap = await likedDeckRef.get();
    const isCurrentlyLiked = likedSnap.exists;

    let newLikeCount = 0;
    let deckCreatorId: string | null = null;
    let deckTitle: string | null = null;

    if (isCurrentlyLiked) {
      await db.runTransaction(async (tx) => {
        const deckSnap = await tx.get(deckRef);
        if (!deckSnap.exists) throw new Error("not-found");
        newLikeCount = Math.max(0, (deckSnap.data()?.likes || 0) - 1);
        tx.delete(likedDeckRef);
        tx.update(deckRef, { likes: FieldValue.increment(-1) });
      });
      return { liked: false, newLikeCount, deckCreatorId: null, deckTitle: null };
    }

    await db.runTransaction(async (tx) => {
      const deckSnap = await tx.get(deckRef);
      if (!deckSnap.exists) throw new Error("not-found");
      const data = deckSnap.data();
      newLikeCount = (data?.likes || 0) + 1;
      deckCreatorId = data?.createdBy || null;
      deckTitle = data?.title || null;
      tx.set(likedDeckRef, { likedAt: FieldValue.serverTimestamp(), deckId });
      tx.update(deckRef, { likes: FieldValue.increment(1) });
    });

    return { liked: true, newLikeCount, deckCreatorId, deckTitle };
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {string} userId - User ID
   * @return {Promise<boolean>}
   */
  async hasBeenNotifiedLiker(deckId: string, userId: string): Promise<boolean> {
    const snap = await db.doc(`decks/${deckId}/notifiedLikers/${userId}`).get();
    return snap.exists;
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {string} userId - User ID
   * @return {Promise<void>}
   */
  async markLikerNotified(deckId: string, userId: string): Promise<void> {
    await db.doc(`decks/${deckId}/notifiedLikers/${userId}`).set({
      notifiedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {CardData} cardData - Card data
   * @param {string[]} [tags] - Tags
   * @return {Promise<string>} ID of the created card
   */
  async addSourceCard(
    deckId: string,
    cardData: { front: string; back: string },
    tags?: string[]
  ): Promise<string> {
    const deckRef = db.doc(`decks/${deckId}`);
    const cardRef = deckRef.collection("cards").doc();
    const now = new Date();
    const card = CardSchema.parse({
      id: cardRef.id,
      cardData: normalizeCardData({ front: cardData.front, back: cardData.back || "" }),
      tags: tags || [],
      createdAt: now,
      firstLearn: { isNew: true },
    });
    const batch = db.batch();
    batch.set(cardRef, card);
    batch.update(deckRef, {
      cardsNum: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return cardRef.id;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {CardData} cardData - Card data
   * @param {string[]} [tags] - Tags
   * @return {Promise<string>} ID of the created card
   */
  async addUserCard(
    userId: string,
    deckId: string,
    cardData: { front: string; back: string },
    tags?: string[]
  ): Promise<string> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const cardRef = deckRef.collection("cards").doc();
    const now = new Date();
    const card = CardSchema.parse({
      id: cardRef.id,
      cardData: normalizeCardData({ front: cardData.front, back: cardData.back || "" }),
      tags: tags || [],
      createdAt: now,
      firstLearn: { isNew: true },
      randomSort: Math.random(),
    });
    const batch = db.batch();
    batch.set(cardRef, card);
    batch.update(deckRef, {
      cardsNum: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      cardIds: FieldValue.arrayUnion(cardRef.id),
    });
    await batch.commit();
    return cardRef.id;
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {string} editorId - Editor ID
   * @return {Promise<void>}
   */
  async addEditor(deckId: string, editorId: string): Promise<void> {
    await db.doc(`decks/${deckId}`).update({
      editors: FieldValue.arrayUnion(editorId),
    });
  }

  /**
   * @param {string} deckId - Deck ID
   * @param {string} editorId - Editor ID
   * @return {Promise<void>}
   */
  async removeEditor(deckId: string, editorId: string): Promise<void> {
    await db.doc(`decks/${deckId}`).update({
      editors: FieldValue.arrayRemove(editorId),
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<boolean>}
   */
  async isLikedByUser(userId: string, deckId: string): Promise<boolean> {
    const snap = await db.doc(`users/${userId}/likedDecks/${deckId}`).get();
    return snap.exists;
  }

  /**
   * @param {string} query - Search query string
   * @param {object} [filters] - Optional search filters
   * @param {number} [limit] - Max number of results
   * @return {Promise<Deck[]>} Matching decks
   */
  async searchDecks(
    query: string,
    filters?: import("memvocado-types").SearchFilters,
    limit = 20
  ): Promise<Deck[]> {
    let q: import("firebase-admin/firestore").Query | import("firebase-admin/firestore").CollectionReference =
      db.collection("decks");

    if (query) {
      const queryLower = query.toLowerCase();
      q = q
        .where("title_lower", ">=", queryLower)
        .where("title_lower", "<=", queryLower + "\uf8ff")
        .where("is_deleted", "==", false);
    }

    if (filters) {
      const { category, tags } = filters;
      if (category) q = q.where("category", "==", category);
      if (Array.isArray(tags) && tags.length > 0) q = q.where("tags", "array-contains-any", tags);
    }

    const snap = await q.limit(limit).get();
    return snap.docs.map((doc) => DeckSchema.parse({ id: doc.id, ...doc.data() }));
  }
}
