import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, WriteBatch } from "firebase-admin/firestore";
import {
  CardData,
  DeckData,
  DeckLearningData,
  transformCardData,
} from "./types/common";

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
      isPublic: true,
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

    // No backward compatibility needed: do not update user's decks array

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
      deck: { id: deckSnap.id, ...deckData } as DeckData,
    };
  } catch (error) {
    logger.error("Error getting deck details", error);
    if (error instanceof Error && error.message === "Deck not found") {
      throw error;
    }
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
    const cards = cardsSnap.docs.map((doc) => transformCardData(doc));

    // Check if there are more cards by trying to get one more
    let hasMore = false;
    if (cardsSnap.docs.length === limit) {
      // If we got exactly the limit, check if there are more
      const lastDoc = cardsSnap.docs[cardsSnap.docs.length - 1];
      const nextQuery = deckRef
        .collection("cards")
        .startAfter(lastDoc)
        .limit(1);
      const nextSnap = await nextQuery.get();
      hasMore = nextSnap.docs.length > 0;
    }

    return {
      cards,
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    };
  } catch (error) {
    logger.error("Error getting deck cards", error);
    if (error instanceof Error && error.message === "Deck not found") {
      throw error;
    }
    throw new Error("Failed to get deck cards");
  }
});

/**
 * Get popular public decks
 */
export const getPopularDecks = onCall(async (request) => {
  const { limit = 8 } = request.data || {};

  try {
    const snapshot = await db
      .collection("decks")
      .where("isPublic", "==", true)
      .orderBy("views", "desc")
      .limit(limit)
      .get();

    const decks = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as DeckData)
    );

    return { decks };
  } catch (error) {
    logger.error("Error getting popular decks", error);
    throw new Error("Failed to get popular decks");
  }
});

/**
 * User-deck equivalents (operate on users/{userId}/decks/{deckId})
 */
export const getUserDeckDetails = onCall(async (request) => {
  const { userId, deckId } = request.data || {};
  if (!userId || !deckId) {
    throw new Error("userId and deckId are required");
  }
  try {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();
    if (!deckSnap.exists) throw new Error("Deck not found");
    return { deck: { id: deckSnap.id, ...deckSnap.data() } as DeckData };
  } catch (error) {
    logger.error("Error getting user deck details", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to get user deck details");
  }
});

export const getUserDeckCards = onCall(async (request) => {
  const { userId, deckId, limit = 20, startAfter } = request.data || {};
  if (!userId || !deckId) {
    throw new Error("userId and deckId are required");
  }
  try {
    // Verify user deck exists
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userDeckSnap = await userDeckRef.get();
    if (!userDeckSnap.exists) throw new Error("Deck not found");

    // Get source deck cards with pagination
    const sourceDeckRef = db.collection("decks").doc(deckId);
    let query = sourceDeckRef.collection("cards").limit(limit);
    if (startAfter) {
      const startAfterDoc = await sourceDeckRef
        .collection("cards")
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    const cardsSnap = await query.get();

    // Join with progress
    const cards = await joinCardsWithProgress(userId, deckId, cardsSnap.docs);

    // Check if there are more cards
    let hasMore = false;
    if (cardsSnap.docs.length === limit) {
      const lastDoc = cardsSnap.docs[cardsSnap.docs.length - 1];
      const nextQuery = sourceDeckRef
        .collection("cards")
        .startAfter(lastDoc)
        .limit(1);
      const nextSnap = await nextQuery.get();
      hasMore = nextSnap.docs.length > 0;
    }
    return {
      cards,
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    };
  } catch (error) {
    logger.error("Error getting user deck cards", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to get user deck cards");
  }
});

/**
 * Helper: Join card content from source deck with user progress (lazy)
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} sourceCards - Source card documents
 * @return {Promise<any[]>} Joined cards with progress
 */
async function joinCardsWithProgress(
  userId: string,
  deckId: string,
  sourceCards: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<any[]> {
  const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const progressRef = userDeckRef.collection("cardProgress");

  // Get all progress documents for these cards in parallel
  const progressPromises = sourceCards.map((cardDoc) =>
    progressRef.doc(cardDoc.id).get()
  );
  const progressDocs = await Promise.all(progressPromises);

  // Join content with progress
  return sourceCards.map((cardDoc, idx) => {
    const cardData = cardDoc.data();
    const progressDoc = progressDocs[idx];
    const progress = progressDoc.exists ? progressDoc.data() : null;

    // Default progress for new cards
    const defaultFirstLearn = {
      isNew: true,
      due: new Date(),
      state: 0,
      consecutiveGood: 0,
    };

    return {
      id: cardDoc.id,
      cardData: {
        front: cardData.front || "",
        back: cardData.back || "",
        tags: cardData.tags || [],
      },
      cardAlgo: progress?.cardAlgo || undefined,
      firstLearn: progress?.firstLearn || defaultFirstLearn,
      grade: progress?.grade ?? -1,
      difficulty: progress?.difficulty ?? 2.5,
      nextReviewInterval: progress?.nextReviewInterval ?? 1,
      lastReviewDate: progress?.lastReviewDate || undefined,
    };
  });
}

export const getUserDueDeckCards = onCall(async (request) => {
  const { userId, deckId, limit = 100 } = request.data || {};
  if (!userId || !deckId) throw new Error("userId and deckId are required");
  try {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();
    if (!deckSnap.exists) throw new Error("Deck not found");

    const cardsSnap = await deckRef.collection("cards").limit(limit).get();
    const now = Date.now();
    const raw = cardsSnap.docs.map((doc) => transformCardData(doc));
    const due = raw.filter((c: any) => {
      const first = c.firstLearn as any;
      const algo = c.cardAlgo as any;
      if (first?.isNew) {
        if (!first?.due) return false;
        const dueTs =
          first.due instanceof Date
            ? first.due.getTime()
            : first.due?.toDate
            ? first.due.toDate().getTime()
            : first.due?.seconds
            ? first.due.seconds * 1000 + (first.due.nanoseconds || 0) / 1000000
            : new Date(first.due).getTime();
        return dueTs <= now;
      }
      if (!algo?.due) return false;
      const dueTs =
        algo.due instanceof Date
          ? algo.due.getTime()
          : algo.due?.toDate
          ? algo.due.toDate().getTime()
          : algo.due?.seconds
          ? algo.due.seconds * 1000 + (algo.due.nanoseconds || 0) / 1000000
          : new Date(algo.due).getTime();
      return dueTs <= now;
    });
    return { cards: due };
  } catch (error) {
    logger.error("Error getting user due deck cards", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to get user due deck cards");
  }
});

export const getUserNewDeckCards = onCall(async (request) => {
  const { userId, deckId, limit = 50 } = request.data || {};
  if (!userId || !deckId) throw new Error("userId and deckId are required");
  try {
    // Verify user deck exists
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userDeckSnap = await userDeckRef.get();
    if (!userDeckSnap.exists) throw new Error("Deck not found");

    // Get source deck cards (all cards from original deck)
    const sourceDeckRef = db.collection("decks").doc(deckId);
    const sourceCardsSnap = await sourceDeckRef
      .collection("cards")
      .limit(limit * 3)
      .get();

    // Join with progress
    const joinedCards = await joinCardsWithProgress(
      userId,
      deckId,
      sourceCardsSnap.docs
    );

    // Filter new candidates (isNew: true, consecutiveGood: 0, no prevAns)
    const candidates = joinedCards.filter((c: any) => {
      const first = c.firstLearn as any;
      const prevAns = (c as any).prevAns;
      const consecutiveGood = first?.consecutiveGood ?? 0;
      if (!first?.isNew) return false;
      let dueTs = Date.now() + 1;
      if (first?.due) {
        if (first.due instanceof Date) dueTs = first.due.getTime();
        else if (first.due?.toDate) dueTs = first.due.toDate().getTime();
        else if (first.due?.seconds) {
          dueTs =
            first.due.seconds * 1000 + (first.due.nanoseconds || 0) / 1000000;
        } else {
          dueTs = new Date(first.due).getTime();
        }
      }
      return dueTs <= Date.now() && !prevAns && consecutiveGood === 0;
    });
    return { cards: candidates.slice(0, limit) };
  } catch (error) {
    logger.error("Error getting user new deck cards", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to get user new deck cards");
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

/**
 * Reset deck progress - removes all card progress data
 */
export const resetDeck = onCall(async (request) => {
  const { deckId } = request.data;
  const auth = request.auth;

  if (!deckId) {
    throw new Error("deckId is required");
  }

  if (!auth) {
    throw new Error("Authentication required");
  }

  const userId = auth.uid;

  try {
    // Verify user owns the deck
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new Error("Deck not found");
    }

    const deckData = deckSnap.data();

    // Check if user is the creator of the deck
    if (deckData?.createdBy !== userId) {
      throw new Error("User does not have permission");
    }

    const cardsRef = deckRef.collection("cards");

    // Get all cards in the deck
    const cardsSnapshot = await cardsRef.get();

    if (cardsSnapshot.empty) {
      logger.info("No cards found in deck", { deckId });
      return { success: true, cardsReset: 0 };
    }

    // Use batch to update all cards (Firestore batch limit is 500)
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    let cardsReset = 0;

    cardsSnapshot.forEach((doc) => {
      const cardRef = cardsRef.doc(doc.id);
      currentBatch.update(cardRef, {
        cardAlgo: FieldValue.delete(),
        firstLearn: FieldValue.delete(),
        grade: -1,
        lastReviewDate: FieldValue.delete(),
        difficulty: 2.5,
        nextReviewInterval: 1,
      });
      cardsReset++;
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    });

    // Add the last batch if it has operations
    if (batchCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    await Promise.all(batches.map((batch) => batch.commit()));

    logger.info("Deck progress reset successfully", {
      deckId,
      userId,
      cardsReset,
    });

    return { success: true, cardsReset };
  } catch (error) {
    logger.error("Error resetting deck progress", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to reset deck progress");
  }
});

/**
 * Update deck settings
 */
export const updateDeckSettings = onCall(async (request) => {
  const { deckId, settings } = request.data || {};
  const auth = request.auth;

  if (!deckId || !settings) {
    throw new Error("deckId and settings are required");
  }

  if (!auth) {
    throw new Error("Authentication required");
  }

  const userId = auth.uid;

  try {
    // Verify user owns the deck
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new Error("Deck not found");
    }

    const deckData = deckSnap.data();

    // Check if user is the creator of the deck
    if (deckData?.createdBy !== userId) {
      throw new Error("User does not have permission");
    }

    // Update deck settings
    await deckRef.update({
      settings: settings,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Deck settings updated successfully", {
      deckId,
      userId,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error updating deck settings", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update deck settings");
  }
});

/**
 * Copy a public deck into user's personal space to track individual progress
 * Source: decks/{deckId}
 * Target: users/{userId}/decks/{deckId} + cards
 */
export const startLearningDeck = onCall(async (request) => {
  const { userId, deckId } = request.data || {};

  if (!userId || !deckId) {
    throw new Error("userId and deckId are required");
  }

  try {
    // Verify source deck exists
    const srcDeckRef = db.collection("decks").doc(deckId);
    const srcDeckSnap = await srcDeckRef.get();
    if (!srcDeckSnap.exists) {
      throw new Error("Deck not found");
    }

    const srcDeck = (srcDeckSnap.data() as DeckData) || {};

    // Create target user deck document (use same deckId for easier mapping)
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userDeckSnap = await userDeckRef.get();

    // If already exists, do not duplicate; return ok
    if (!userDeckSnap.exists) {
      await userDeckRef.set({
        title: srcDeck.title,
        id: deckId,
        createdAt: srcDeck.createdAt || new Date(),
        createdBy: srcDeck.createdBy || null,
        cardsNum: srcDeck.cardsNum || 0,
        category: srcDeck.category || "",
        todoCardsNum: 0,
        doneCardsNum: 0,
        lastReviewDate: undefined,
        dueCardsNumPerDay: undefined,
        newCardsNumPerDay: undefined,
        zenMode: false,
      } as DeckLearningData);
    }

    logger.info("Deck copied to user space", { userId, deckId });
    return { success: true };
  } catch (error) {
    logger.error("Error starting learning deck", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to start learning deck");
  }
});
