import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, WriteBatch } from "firebase-admin/firestore";
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
    const cards = cardsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Check if there are more cards by trying to get one more
    let hasMore = false;
    if (cardsSnap.docs.length === limit) {
      // There might be more, so check by getting one more document
      const lastDoc = cardsSnap.docs[cardsSnap.docs.length - 1];
      const nextQuery = deckRef.collection("cards").startAfter(lastDoc).limit(1);
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
      
      if (first?.isNew) {
        if (!first?.due) return false;
        // Handle Firestore Timestamp or Date
        const dueTs = first.due instanceof Date 
          ? first.due.getTime()
          : first.due?.toDate 
            ? first.due.toDate().getTime()
            : first.due?.seconds 
              ? first.due.seconds * 1000 + (first.due.nanoseconds || 0) / 1000000
              : new Date(first.due).getTime();
        return dueTs <= now;
      }
      
      if (!algo?.due) return false;
      // Handle Firestore Timestamp or Date
      const dueTs = algo.due instanceof Date
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
    logger.error("Error getting due deck cards", error);
    if (error instanceof Error && error.message === "Deck not found") {
      throw error;
    }
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

    const decks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { decks };
  } catch (error) {
    logger.error("Error getting popular decks", error);
    throw new Error("Failed to get popular decks");
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
      // Also check if deck is in user's decks list
      const userRef = db.doc(`users/${userId}`);
      const userSnap = await userRef.get();
      const userData = userSnap.data();
      const userDecks = userData?.decks || [];

      if (!userDecks.includes(deckId)) {
        throw new Error(
          "Unauthorized: You don't have permission to reset this deck"
        );
      }
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
      // Also check if deck is in user's decks list
      const userRef = db.doc(`users/${userId}`);
      const userSnap = await userRef.get();
      const userData = userSnap.data();
      const userDecks = userData?.decks || [];

      if (!userDecks.includes(deckId)) {
        throw new Error(
          "Unauthorized: You don't have permission to update this deck"
        );
      }
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
