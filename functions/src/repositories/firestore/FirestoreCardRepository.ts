import { getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { CardSchema, type Card, type CardAlgo } from "memvocado-types";
import type {
  CardRepository,
  GetNewCardsOptions,
} from "../interfaces/CardRepository";

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
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userCardsRef = deckRef.collection("cards");

    let userCardsSnap;
    if (shuffleNewCards) {
      userCardsSnap = await userCardsRef
        .where("firstLearn.isNew", "==", true)
        .limit(effectiveLimit)
        .get();
    } else {
      userCardsSnap = await userCardsRef
        .where("firstLearn.isNew", "==", true)
        .orderBy("createdAt", "asc")
        .limit(effectiveLimit)
        .get();
    }

    return userCardsSnap.docs.map((doc) =>
      CardSchema.parse({ id: doc.id, ...doc.data() })
    );
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

    for (const sourceDoc of sourceSnap.docs) {
      const src = sourceDoc.data() as Card;
      const card = CardSchema.parse({
        id: sourceDoc.id,
        cardData: {
          front: src.cardData?.front || "",
          back: src.cardData?.back || "",
        },
        tags: src.tags || [],
        createdAt: src.createdAt || new Date(),
        firstLearn: { isNew: true, due: new Date() },
      });
      currentBatch.set(userCardsRef.doc(sourceDoc.id), card, { merge: true });
      batchCount++;
      if (batchCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) batches.push(currentBatch);
    await Promise.all(batches.map((b) => b.commit()));
  }
}
