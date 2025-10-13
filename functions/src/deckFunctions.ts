import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { CardData } from "./types/common";

const db = getFirestore();

/**
 * Bulk create deck with cards
 */
export const createDeckWithCards = onCall(async (request) => {
  const { title, cards, userId } = request.data;

  if (!title || !cards || !userId) {
    throw new Error("Title, cards, and userId are required");
  }

  try {
    const batch = db.batch();

    // Create deck document
    const deckRef = db.collection("decks").doc();
    batch.set(deckRef, {
      title,
      cardsNum: cards.length,
      createdBy: userId,
      createdAt: new Date(),
      isPublic: false,
    });

    // Create cards
    cards.forEach((card: CardData) => {
      const cardRef = deckRef.collection("cards").doc();
      batch.set(cardRef, {
        ...card,
        createdAt: new Date(),
        difficulty: 2.5,
        nextReviewInterval: 1,
        grade: -1,
      });
    });

    // Add deck to user's decks
    const userRef = db.doc(`users/${userId}`);
    batch.update(userRef, {
      decks: FieldValue.arrayUnion(deckRef.id),
    });

    await batch.commit();

    logger.info("Deck created successfully", {
      deckId: deckRef.id,
      cardCount: cards.length,
    });

    return { deckId: deckRef.id };
  } catch (error) {
    logger.error("Error creating deck", error);
    throw new Error("Failed to create deck");
  }
});

/**
 * Get deck details only (without cards)
 */
export const getDeckDetails = onCall(async (request) => {
  const { deckId } = request.data || {};

  if (!deckId) {
    throw new Error("deckId is required");
  }

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new Error("Deck not found");
    }

    const deckData = deckSnap.data() || {};

    return {
      deck: { id: deckSnap.id, ...deckData },
    };
  } catch (error) {
    logger.error("Error getting deck details", error);
    throw new Error("Failed to get deck details");
  }
});

/**
 * Get cards for a deck with pagination
 */
export const getDeckCards = onCall(async (request) => {
  const { deckId, limit = 20, startAfter } = request.data || {};

  if (!deckId) {
    throw new Error("deckId is required");
  }

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new Error("Deck not found");
    }

    let query = deckRef.collection("cards").limit(limit);

    if (startAfter) {
      const startAfterDoc = await deckRef
        .collection("cards")
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const cardsSnap = await query.get();
    const cards = cardsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      cards,
      hasMore: cardsSnap.docs.length === limit,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    };
  } catch (error) {
    logger.error("Error getting deck cards", error);
    throw new Error("Failed to get deck cards");
  }
});

/**
 * Get due cards for a deck (server-side filtering)
 * - Returns FSRS due cards (cardAlgo.due <= now)
 * - Returns firstLearn due cards (firstLearn.isNew && firstLearn.due <= now)
 */
export const getDueDeckCards = onCall(async (request) => {
  const { deckId, limit = 100 } = request.data || {};

  if (!deckId) {
    throw new Error("deckId is required");
  }

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const cardsSnap = await deckRef.collection("cards").limit(limit).get();
    const now = Date.now();

    const raw = cardsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const due = raw.filter((c: any) => {
      const first = c.firstLearn as any;
      const algo = c.cardAlgo as any;
      const dueTs = first?.isNew
        ? first?.due
          ? new Date(first.due).getTime()
          : 0
        : algo?.due
        ? new Date(algo.due).getTime()
        : 0;
      return dueTs <= now;
    });

    return { cards: due };
  } catch (error) {
    logger.error("Error getting due deck cards", error);
    throw new Error("Failed to get due deck cards");
  }
});

/**
 * Get new candidate cards (firstLearn.isNew && not yet introduced this session)
 */
export const getNewDeckCards = onCall(async (request) => {
  const { deckId, limit = 50 } = request.data || {};

  if (!deckId) {
    throw new Error("deckId is required");
  }

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const cardsSnap = await deckRef.collection("cards").limit(limit).get();

    const raw = cardsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const candidates = raw.filter((c: any) => {
      const first = c.firstLearn as any;
      const prevAns = (c as any).prevAns;
      const consecutiveGood =
        (c as any).consecutiveGood ?? first?.consecutiveGood ?? 0;
      return (
        first?.isNew &&
        (!first?.due || new Date(first.due).getTime() <= Date.now()) &&
        !prevAns &&
        consecutiveGood === 0
      );
    });

    return { cards: candidates.slice(0, limit) };
  } catch (error) {
    logger.error("Error getting new deck cards", error);
    throw new Error("Failed to get new deck cards");
  }
});

/**
 * Update user stats when deck is modified
 */
export const updateUserStats = onDocumentWritten(
  "users/{userId}/decks/{deckId}",
  async (event) => {
    const userId = event.params.userId;

    try {
      const decksSnapshot = await db.collection(`users/${userId}/decks`).get();

      let totalCards = 0;
      let totalReviews = 0;
      let totalDifficulty = 0;
      let reviewCount = 0;

      // Calculate totals from all user decks
      for (const deckDoc of decksSnapshot.docs) {
        const cardsSnapshot = await deckDoc.ref.collection("cards").get();
        totalCards += cardsSnapshot.size;

        cardsSnapshot.forEach((cardDoc) => {
          const cardData = cardDoc.data();
          if (cardData.grade !== undefined) {
            totalReviews++;
            totalDifficulty += cardData.difficulty || 2.5;
            reviewCount++;
          }
        });
      }

      const averageDifficulty =
        reviewCount > 0 ? totalDifficulty / reviewCount : 0;

      // Update user statistics
      await db.doc(`users/${userId}`).update({
        stats: {
          totalCards,
          totalDecks: decksSnapshot.size,
          totalReviews,
          averageDifficulty,
          lastStudyDate: new Date(),
        },
      });

      logger.info("User stats updated successfully", {
        userId,
        totalCards,
        totalDecks: decksSnapshot.size,
        totalReviews,
      });
    } catch (error) {
      logger.error("Error updating user stats", error);
    }
  }
);
