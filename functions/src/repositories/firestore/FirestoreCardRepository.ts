import { getFirestore, FieldValue, FieldPath, type WriteBatch } from "firebase-admin/firestore";
import { CardSchema, type Card, type CardAlgo } from "memvocado-types";
import type {
  CardRepository,
  GetNewCardsOptions,
} from "../interfaces/CardRepository";
import { normalizeCardData } from "../../utils/cardUtils";

const db = getFirestore();

/**
 * Firestore-backed implementation of CardRepository.
 */
export class FirestoreCardRepository implements CardRepository {
  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<Card[]>} Due forward cards
   */
  async getDueCards(userId: string, deckId: string): Promise<Card[]> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const now = Date.now();
    const nowEnd = new Date(now);
    nowEnd.setHours(23, 59, 59, 999);

    const cardsSnapFirst = await deckRef
      .collection("cards")
      .where("firstLearn.isNew", "==", false)
      .where("firstLearn.isFirst", "==", true)
      .get();

    const cardsSnapDue = await deckRef
      .collection("cards")
      .where("cardAlgo.due", "<=", nowEnd)
      .get();

    const seen = new Set<string>();
    const validatedRaw: Card[] = [];
    for (const doc of [...cardsSnapFirst.docs, ...cardsSnapDue.docs]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        validatedRaw.push(CardSchema.parse({ id: doc.id, ...doc.data() }));
      }
    }

    const dueFirst: Card[] = validatedRaw.filter(
      (c) => c.firstLearn?.isFirst && !c.firstLearn?.isNew
    );
    const dueFSRS: Card[] = validatedRaw.filter(
      (c) =>
        c.cardAlgo?.due &&
        c.cardAlgo.due.getTime() <= now &&
        !c.firstLearn?.isNew
    );

    const dueSeen = new Set<string>();
    const validatedCards: Card[] = [];
    for (const card of [...dueFirst, ...dueFSRS]) {
      if (!dueSeen.has(card.id)) {
        dueSeen.add(card.id);
        validatedCards.push(card);
      }
    }

    return validatedCards;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<Card[]>} Due reverse cards
   */
  async getDueReverseCards(userId: string, deckId: string): Promise<Card[]> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const now = Date.now();
    const nowEnd = new Date(now);
    nowEnd.setHours(23, 59, 59, 999);

    const [cardsSnapFirst, cardsSnapDue] = await Promise.all([
      deckRef
        .collection("cards")
        .where("firstLearnReverse.isNew", "==", false)
        .where("firstLearnReverse.isFirst", "==", true)
        .get(),
      deckRef
        .collection("cards")
        .where("cardAlgoReverse.due", "<=", nowEnd)
        .get(),
    ]);

    const seen = new Set<string>();
    const validatedRaw: Card[] = [];
    for (const doc of [...cardsSnapFirst.docs, ...cardsSnapDue.docs]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        validatedRaw.push(CardSchema.parse({ id: doc.id, ...doc.data() }));
      }
    }

    const dueFirst = validatedRaw.filter(
      (c) => c.firstLearnReverse?.isFirst && !c.firstLearnReverse?.isNew
    );
    const dueFSRS = validatedRaw.filter(
      (c) =>
        c.cardAlgoReverse?.due &&
        c.cardAlgoReverse.due.getTime() <= now &&
        !c.firstLearnReverse?.isNew
    );

    return [...dueFirst, ...dueFSRS];
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {GetNewCardsOptions} options - Options
   * @return {Promise<Card[]>} New cards
   */
  async getNewCards(
    userId: string,
    deckId: string,
    options: GetNewCardsOptions
  ): Promise<Card[]> {
    const { effectiveLimit, shuffleNewCards } = options;
    const colRef = db.collection(`users/${userId}/decks/${deckId}/cards`);

    if (!shuffleNewCards) {
      const snap = await colRef
        .where("firstLearn.isNew", "==", true)
        .orderBy("createdAt", "asc")
        .limit(effectiveLimit)
        .get();
      return snap.docs.map((doc) => CardSchema.parse({ id: doc.id, ...doc.data() }));
    }

    // Shuffled path: randomSort seed + wrap-around
    const seed = Math.random();

    const snap1 = await colRef
      .where("firstLearn.isNew", "==", true)
      .where("randomSort", ">=", seed)
      .orderBy("randomSort", "asc")
      .limit(effectiveLimit)
      .get();

    let docs = snap1.docs;

    if (docs.length < effectiveLimit) {
      const snap2 = await colRef
        .where("firstLearn.isNew", "==", true)
        .where("randomSort", "<", seed)
        .orderBy("randomSort", "asc")
        .limit(effectiveLimit - docs.length)
        .get();
      docs = [...docs, ...snap2.docs];
    }

    const cards = docs.map((doc) => CardSchema.parse({ id: doc.id, ...doc.data() }));

    // Final in-memory shuffle to remove sequential bias from nearby seeds
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {string[]} cardIds - Card IDs to fetch (order is preserved)
   * @return {Promise<Card[]>} Cards in the same order as cardIds
   */
  async getCardsByIds(userId: string, deckId: string, cardIds: string[]): Promise<Card[]> {
    if (cardIds.length === 0) return [];
    const colRef = db.collection(`users/${userId}/decks/${deckId}/cards`);
    const CHUNK = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < cardIds.length; i += CHUNK) {
      chunks.push(cardIds.slice(i, i + CHUNK));
    }
    const snapshots = await Promise.all(
      chunks.map((chunk) => colRef.where(FieldPath.documentId(), "in", chunk.map((id) => colRef.doc(id))).get())
    );
    const cardMap = new Map<string, Card>();
    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        cardMap.set(doc.id, CardSchema.parse({ id: doc.id, ...doc.data() }));
      }
    }
    return cardIds.flatMap((id) => (cardMap.has(id) ? [cardMap.get(id)!] : []));
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {Card[]} cards - Cards to initialise
   * @return {Promise<void>}
   */
  async initReverseFields(
    userId: string,
    deckId: string,
    cards: Card[]
  ): Promise<void> {
    const batch = db.batch();
    let batchOps = 0;
    const DEFAULT_ALGO: CardAlgo = {
      difficulty: 2.5,
      scheduled_days: 1,
      due: new Date(),
      reps: 0,
      state: 0,
      stability: 0,
      elapsed_days: 0,
      lapses: 0,
    };
    for (const card of cards) {
      if (!card.cardAlgoReverse || !card.firstLearnReverse) {
        const cardRef = db.doc(`users/${userId}/decks/${deckId}/cards/${card.id}`);
        const updateData: Record<string, unknown> = {};
        if (!card.cardAlgoReverse) {
          updateData.cardAlgoReverse = DEFAULT_ALGO;
          card.cardAlgoReverse = DEFAULT_ALGO;
        }
        if (!card.firstLearnReverse) {
          updateData.firstLearnReverse = { isNew: true };
          card.firstLearnReverse = { isNew: true };
        }
        batch.update(cardRef, updateData);
        batchOps++;
      }
    }
    if (batchOps > 0) await batch.commit();
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {Card} card - Card to write
   * @return {Promise<void>}
   */
  async setCard(userId: string, deckId: string, card: Card): Promise<void> {
    await db
      .doc(`users/${userId}/decks/${deckId}/cards/${card.id}`)
      .set(CardSchema.parse(card), { merge: true });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {string} cardId - Card ID
   * @return {Promise<Card | null>} Card or null
   */
  async getCard(
    userId: string,
    deckId: string,
    cardId: string
  ): Promise<Card | null> {
    const snap = await db
      .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
      .get();
    if (!snap.exists) return null;
    return CardSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} deckId - Source deck ID
   * @param {string} cardId - Card ID
   * @return {Promise<Card | null>} Card or null
   */
  async getSourceDeckCard(
    deckId: string,
    cardId: string
  ): Promise<Card | null> {
    const snap = await db.doc(`decks/${deckId}/cards/${cardId}`).get();
    if (!snap.exists) return null;
    return CardSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<Card[]>} All cards in the user's deck copy
   */
  async getAllUserCards(userId: string, deckId: string): Promise<Card[]> {
    const snap = await db
      .collection(`users/${userId}/decks/${deckId}/cards`)
      .get();
    return snap.docs.map((doc) =>
      CardSchema.parse({ id: doc.id, ...doc.data() })
    );
  }

  /**
   * @param {string} deckId - Source deck ID
   * @return {Promise<Card[]>} All cards in the source deck
   */
  async getAllSourceCards(deckId: string): Promise<Card[]> {
    const snap = await db.collection(`decks/${deckId}/cards`).get();
    return snap.docs.map((doc) =>
      CardSchema.parse({ id: doc.id, ...doc.data() })
    );
  }

  /**
   * @param {string} sourceDeckId - Source deck ID
   * @param {string} userId - User ID
   * @param {string} userDeckId - User deck ID
   * @return {Promise<void>}
   */
  async bulkCopyCards(
    sourceDeckId: string,
    userId: string,
    userDeckId: string
  ): Promise<void> {
    const sourceSnap = await db
      .collection(`decks/${sourceDeckId}/cards`)
      .get();
    if (sourceSnap.empty) return;

    const userCardsRef = db.collection(
      `users/${userId}/decks/${userDeckId}/cards`
    );
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    const copiedIds: string[] = [];

    for (const sourceDoc of sourceSnap.docs) {
      const src = sourceDoc.data() as Card;
      const card = CardSchema.parse({
        id: sourceDoc.id,
        cardData: normalizeCardData({
          front: src.cardData?.front || "",
          back: src.cardData?.back || "",
        }),
        tags: src.tags || [],
        createdAt: src.createdAt || new Date(),
        firstLearn: { isNew: true, due: new Date() },
        randomSort: Math.random(),
      });
      currentBatch.set(userCardsRef.doc(sourceDoc.id), card, { merge: true });
      copiedIds.push(sourceDoc.id);
      batchCount++;
      if (batchCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) batches.push(currentBatch);
    await Promise.all(batches.map((b) => b.commit()));

    if (copiedIds.length > 0) {
      await db.doc(`users/${userId}/decks/${userDeckId}`).update({ cardIds: copiedIds });
    }
  }

  // ── New methods ─────────────────────────────────────────────────────────

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async bulkResetCards(userId: string, deckId: string): Promise<void> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const cardsSnap = await deckRef.collection("cards").get();
    if (cardsSnap.empty) return;

    const CHUNK = 499;
    let batch = db.batch();
    let count = 0;

    // Reset dailyStats on deck doc (counts as 1 op)
    batch.update(deckRef, { dailyStats: null });
    count++;

    for (const doc of cardsSnap.docs) {
      batch.update(doc.ref, {
        cardAlgo: FieldValue.delete(),
        cardAlgoReverse: FieldValue.delete(),
        firstLearn: { isNew: true },
        firstLearnReverse: FieldValue.delete(),
        lastReviewDate: FieldValue.delete(),
      });
      count++;
      if (count >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async bulkFlipCards(userId: string, deckId: string): Promise<void> {
    const cardsSnap = await db
      .collection(`users/${userId}/decks/${deckId}/cards`)
      .get();
    if (cardsSnap.empty) return;

    const CHUNK = 499;
    let batch = db.batch();
    let count = 0;

    for (const doc of cardsSnap.docs) {
      const { cardData } = doc.data();
      batch.update(doc.ref, {
        "cardData.front": cardData?.back ?? "",
        "cardData.back": cardData?.front ?? "",
        "cardData.frontLower": (cardData?.back ?? "").trim().toLowerCase(),
        "cardData.backLower": (cardData?.front ?? "").trim().toLowerCase(),
      });
      count++;
      if (count >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {object} ops - Upsert, update, and delete operations
   * @param {Record<string, unknown>} deckUpdate - Deck metadata update
   * @return {Promise<void>}
   */
  async bulkSyncUserCards(
    userId: string,
    deckId: string,
    ops: {
      upsert: Card[];
      update: Array<{
        id: string;
        cardData: { front: string; back: string };
        tags: string[];
      }>;
      delete: string[];
    },
    deckUpdate: Record<string, unknown>
  ): Promise<void> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const cardsRef = deckRef.collection("cards");
    const now = new Date();

    const CHUNK = 450;
    let batch = db.batch();
    let count = 0;

    const flush = async () => {
      await batch.commit();
      batch = db.batch();
      count = 0;
    };

    const enqueue = async (mutate: (b: WriteBatch) => void) => {
      mutate(batch);
      count++;
      if (count >= CHUNK) await flush();
    };

    for (const card of ops.upsert) {
      await enqueue((b) => b.set(cardsRef.doc(card.id), card, { merge: true }));
    }

    for (const u of ops.update) {
      await enqueue((b) =>
        b.update(cardsRef.doc(u.id), {
          cardData: normalizeCardData(u.cardData),
          tags: u.tags,
          updatedAt: now,
        })
      );
    }

    for (const id of ops.delete) {
      await enqueue((b) => b.delete(cardsRef.doc(id)));
    }

    // Deck metadata update
    await enqueue((b) => b.update(deckRef, deckUpdate));

    if (count > 0) await flush();

    // Maintain cardIds array separately (arrayUnion and arrayRemove can't share a batch op)
    if (ops.upsert.length > 0) {
      await deckRef.update({ cardIds: FieldValue.arrayUnion(...ops.upsert.map((c) => c.id)) });
    }
    if (ops.delete.length > 0) {
      await deckRef.update({ cardIds: FieldValue.arrayRemove(...ops.delete) });
    }
  }

  /**
   * @param {string} deckId - Source deck ID
   * @param {object} changes - Created, updated, and deleted card operations
   * @return {Promise<void>}
   */
  async applySourceCardChanges(
    deckId: string,
    changes: {
      created: Array<{
        cardData: { front: string; back: string };
        tags?: string[];
      }>;
      updated: Array<{
        id: string;
        cardData: { front: string; back: string };
        tags?: string[];
      }>;
      deleted: string[];
    }
  ): Promise<void> {
    const deckRef = db.doc(`decks/${deckId}`);
    const cardsRef = deckRef.collection("cards");
    const now = new Date();

    const CHUNK = 499;
    let batch = db.batch();
    let count = 0;

    const flush = async () => {
      await batch.commit();
      batch = db.batch();
      count = 0;
    };

    const enqueue = async (mutate: (b: WriteBatch) => void) => {
      mutate(batch);
      count++;
      if (count >= CHUNK) await flush();
    };

    for (const id of changes.deleted) {
      await enqueue((b) => b.delete(cardsRef.doc(id)));
    }

    for (const u of changes.updated) {
      await enqueue((b) =>
        b.update(cardsRef.doc(u.id), {
          cardData: normalizeCardData(u.cardData),
          tags: u.tags || [],
        })
      );
    }

    for (const c of changes.created) {
      const cardRef = cardsRef.doc();
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
      await enqueue((b) => b.set(cardRef, card));
    }

    if (count > 0) await flush();
  }

  /**
   * @param {string} deckId - Source deck ID
   * @param {string} cardId - Card ID
   * @param {object} data - Updated card data
   * @return {Promise<void>}
   */
  async updateSourceCard(
    deckId: string,
    cardId: string,
    data: { cardData: { front: string; back: string }; tags: string[] }
  ): Promise<void> {
    const ref = db.doc(`decks/${deckId}/cards/${cardId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("not-found");
    await ref.update({ cardData: normalizeCardData(data.cardData), tags: data.tags });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {string} cardId - Card ID
   * @param {object} data - Updated card data
   * @return {Promise<void>}
   */
  async updateUserCardIfExists(
    userId: string,
    deckId: string,
    cardId: string,
    data: { cardData: { front: string; back: string }; tags: string[] }
  ): Promise<void> {
    const ref = db.doc(`users/${userId}/decks/${deckId}/cards/${cardId}`);
    const snap = await ref.get();
    if (!snap.exists) return;
    await ref.update({ cardData: normalizeCardData(data.cardData), tags: data.tags });
  }

  /**
   * @param {string} deckId - Source deck ID
   * @param {number} limit - Max cards per page
   * @param {string} [startAfterId] - Cursor card ID for pagination
   * @return {Promise<object>} Paginated cards with hasMore and lastDocId
   */
  async getSourceDeckCardsPaginated(
    deckId: string,
    limit: number,
    startAfterId?: string
  ): Promise<{ cards: Card[]; hasMore: boolean; lastDocId: string | null }> {
    const colRef = db.collection(`decks/${deckId}/cards`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = colRef.limit(limit);
    if (startAfterId) {
      const cursor = await colRef.doc(startAfterId).get();
      if (cursor.exists) query = query.startAfter(cursor);
    }
    const snap = await query.get();
    let hasMore = false;
    if (snap.docs.length === limit) {
      const next = await colRef.startAfter(snap.docs[snap.docs.length - 1]).limit(1).get();
      hasMore = next.docs.length > 0;
    }
    return {
      cards: snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
        CardSchema.parse({ id: doc.id, ...doc.data() })
      ),
      hasMore,
      lastDocId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null,
    };
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {number} limit - Max cards per page
   * @param {string} [startAfterId] - Cursor card ID for pagination
   * @return {Promise<object>} Paginated cards with hasMore and lastDocId
   */
  async getUserDeckCardsPaginated(
    userId: string,
    deckId: string,
    limit: number,
    startAfterId?: string
  ): Promise<{ cards: Card[]; hasMore: boolean; lastDocId: string | null }> {
    const colRef = db.collection(`users/${userId}/decks/${deckId}/cards`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = colRef.limit(limit);
    if (startAfterId) {
      const cursor = await colRef.doc(startAfterId).get();
      if (cursor.exists) query = query.startAfter(cursor);
    }
    const snap = await query.get();
    let hasMore = false;
    if (snap.docs.length === limit) {
      const next = await colRef.startAfter(snap.docs[snap.docs.length - 1]).limit(1).get();
      hasMore = next.docs.length > 0;
    }
    return {
      cards: snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
        CardSchema.parse({ id: doc.id, ...doc.data() })
      ),
      hasMore,
      lastDocId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null,
    };
  }
}
