import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, WriteBatch } from "firebase-admin/firestore";
import {
  Card,
  DeckLearningData,
  CardCore,
  DeckSchema,
  DeckSettings,
  DeckSettingsSchema,
  Deck,
  DeckCore,
  DeckCoreSchema,
  CardCoreSchema,
  CardSchema,
  FirstLearn,
  DeckLearningDataSchema,
  DeckSettingsUpdateSchema,
  CardDataUpdateSchema,
  CardCoreUpdateSchema,
  type CardDataUpdate,
  type CardCoreUpdate,
  UserStats,
  UserStatsSchema,
  CardGrade,
  User,
} from "./types/common";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

/**
 * Bulk create deck with cards
 */
export const createDeckWithCards = onCall(async (request) => {
  const { deckData, cards, userId } = request.data;

  if (!deckData || !cards || !userId) {
    throw new Error("deckData, cards, and userId are required");
  }
  const deckCore = deckData as DeckCore;
  const validatedDeckCore = DeckCoreSchema.parse(deckCore);

  try {
    const batch = db.batch();

    // Create deck document
    const deckRef = db.collection("decks").doc();
    const deck = {
      id: deckRef.id,
      title: validatedDeckCore.title,
      category: validatedDeckCore.category,
      icon: validatedDeckCore.icon,
      cardsNum: cards.length,
      createdBy: userId,
      createdAt: new Date(),
      isPublic: validatedDeckCore.isPublic,
      is_deleted: false,
      updatedAt: new Date(),
    } as Deck;

    const validatedDeck = DeckSchema.parse(deck);

    batch.set(deckRef, validatedDeck);

    cards.forEach((card: CardCore) => {
      const validatedCardCore = CardCoreSchema.parse(card);
      const cardData = {
        ...validatedCardCore,
        createdAt: new Date(),
        firstLearn: {
          isNew: true,
        } as FirstLearn,
      } as Card;

      const cardRef = deckRef.collection("cards").doc();

      const validatedCard = CardSchema.parse({
        ...cardData,
        id: cardRef.id,
      });
      batch.set(cardRef, validatedCard);
    });

    await batch.commit();

    logger.info("Deck created successfully", {
      deckId: deckRef.id,
      cardCount: cards.length,
    });

    return serializeTimestamps({ deckId: deckRef.id });
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

    const deckDataRaw = deckSnap.data() || {};
    const deckData = { ...deckDataRaw } as Deck;

    const userRef = db.doc(`users/${deckData.createdBy}`);
    const userSnap = await userRef.get();
    const userData = userSnap.data() as User;

    // Check if deck is deleted
    if (deckData.is_deleted === true) {
      throw new Error("Deck not found");
    }

    // Use document ID (override any id field in data)
    deckData.id = deckSnap.id;
    const validatedDeck = DeckSchema.parse(deckData);
    return serializeTimestamps({
      deck: validatedDeck as Deck,
      username: userData.username,
    });
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
    const cards = cardsSnap.docs.map((doc) => doc.data() as Card);
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

    const validatedCards = cards.map((card) => CardSchema.parse(card));

    return serializeTimestamps({
      cards: validatedCards as Card[],
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    });
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
      .where("is_deleted", "==", false)
      .orderBy("views", "desc")
      .limit(limit)
      .get();

    const decks = snapshot.docs.map((doc) => doc.data() as Deck);
    const validatedDecks = decks.map((deck) => DeckSchema.parse(deck));

    return serializeTimestamps({ decks: validatedDecks as Deck[] });
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
    if (!deckSnap.exists) return serializeTimestamps({ deck: null });
    const deckData = deckSnap.data() as Deck;
    const validatedDeck = DeckLearningDataSchema.parse(deckData);
    return serializeTimestamps({ deck: validatedDeck as DeckLearningData });
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
    return serializeTimestamps({
      cards,
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    });
  } catch (error) {
    logger.error("Error getting user deck cards", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to get user deck cards");
  }
});

/**
 * Helper: Join card content from source deck with user progress (lazy)
 * Also includes cards that exist only in user's local copy (deleted from source)
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} sourceCards - Source card documents
 * @return {Promise<any[]>} Joined cards with progress
 */
async function joinCardsWithProgress(
  userId: string,
  deckId: string,
  sourceCards: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<Card[]> {
  const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const userCardsRef = userDeckRef.collection("cards");

  // Get all user's local cards (for deep copy and deleted cards)
  const userCardsSnap = await userCardsRef.get();
  const userCardsMap = new Map(
    userCardsSnap.docs.map((doc) => [doc.id, doc.data()])
  );

  // Create map of source card IDs for quick lookup
  const sourceCardIds = new Set(sourceCards.map((doc) => doc.id));

  const result: Card[] = [];

  // Process source cards (use source content, user's progress)
  for (const cardDoc of sourceCards) {
    const cardData = cardDoc.data();
    const userCardData = userCardsMap.get(cardDoc.id);
    const progress = userCardData || null;

    // Default progress for new cards (lazy - not created yet)
    const defaultFirstLearn = {
      isNew: true,
    } as FirstLearn;

    const card: Card = {
      id: cardDoc.id,
      cardData: {
        front: cardData.front || "",
        back: cardData.back || "",
      },
      createdAt: cardData.createdAt || new Date(),
      tags: cardData.tags || [],
      cardAlgo: progress?.cardAlgo || undefined,
      firstLearn: progress?.firstLearn || defaultFirstLearn,
      // Flag to indicate if content differs from local copy
      hasChanges: progress
        ? progress.front !== cardData.front ||
          progress.back !== cardData.back ||
          JSON.stringify(progress.tags || []) !==
            JSON.stringify(cardData.tags || [])
        : false,
    };

    const validatedCard = CardSchema.parse(card);
    result.push(validatedCard);
  }

  // Add cards that exist only in user's local copy (deleted from source)
  for (const [cardId, userCardData] of userCardsMap.entries()) {
    if (!sourceCardIds.has(cardId)) {
      // Card was deleted from source, use local copy

      const card: Card = {
        id: cardId,
        cardData: {
          front: userCardData.front || "",
          back: userCardData.back || "",
        },
        tags: Array.isArray(userCardData.tags) ? userCardData.tags : [],
        cardAlgo: userCardData.cardAlgo || undefined,
        firstLearn: userCardData.firstLearn || {
          isNew: true,
        },
        createdAt: userCardData.createdAt || new Date(),
        hasChanges: true, // Flag indicating this card is from local copy only
      };

      const validatedCard = CardSchema.parse(card);
      result.push(validatedCard);
    }
  }

  return result;
}

export const getUserDueDeckCards = onCall(async (request) => {
  const { userId, deckId, limit = 100 } = request.data || {};
  if (!userId || !deckId) throw new Error("userId and deckId are required");
  try {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();
    if (!deckSnap.exists) throw new Error("Deck not found");

    const cardsSnap = await deckRef.collection("cards").get();
    const now = Date.now();
    const raw = cardsSnap.docs.map((doc) => doc.data() as Card);

    const validatedRaw: Card[] = raw.map((c) => CardSchema.parse(c));

    const dueFirst: Card[] = validatedRaw.filter(
      (c) => c.firstLearn?.isFirst && !c.firstLearn?.isNew
    );
    const dueFSRS: Card[] = validatedRaw.filter(
      (c) => c.cardAlgo?.due && c.cardAlgo.due.getTime() <= now
    );

    const validatedCards: Card[] = [...dueFirst, ...dueFSRS].map((c) =>
      CardSchema.parse(c)
    );

    if (limit == -1) {
      // jesli limit jest na -1 to zwracamy wszystkie karty (bez limitu)
      return serializeTimestamps({ cards: validatedCards as Card[] });
    } else {
      return serializeTimestamps({
        cards: validatedCards.slice(0, limit) as Card[],
      });
    }
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

    // Get new cards directly from user's collection (all cards are already copied)
    const userCardsRef = userDeckRef.collection("cards");
    const userCardsSnap = await userCardsRef
      .where("firstLearn.isNew", "==", true)
      .limit(limit)
      .get();

    const cards = userCardsSnap.docs.map((doc) => {
      return {
        id: doc.id,
        ...doc.data(),
      } as Card;
    });

    const validatedCards: Card[] = cards.map((c) => CardSchema.parse(c));

    return serializeTimestamps({ cards: validatedCards });
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

      const userStats: UserStats = {
        totalCards: totalCards,
        totalDecks: decksSnapshot.size,
        totalReviews: totalReviews,
        averageDifficulty: averageDifficulty,
        lastStudyDate: new Date(),
        currentStreak: 0,
        longestStreak: 0,
      };

      const validatedUserStats = UserStatsSchema.parse(userStats);
      // Update user statistics
      await db.doc(`users/${userId}`).update({
        stats: validatedUserStats,
      });

      logger.info("User stats updated succssfully", {
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
  const { deckId, userId } = request.data;
  const auth = request.auth;

  if (!deckId) {
    throw new Error("deckId is required");
  }

  if (!auth) {
    throw new Error("Authentication required");
  }

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
      return serializeTimestamps({ success: true, cardsReset: 0 });
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
        firstLearn: {
          isNew: true,
        },
        lastReviewDate: FieldValue.delete(),
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

    return serializeTimestamps({ success: true, cardsReset });
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

    // Waliduj i typuj częściową aktualizację ustawień
    const partialSettings = DeckSettingsUpdateSchema.parse(settings);

    // Merge with existing settings
    const currentSettings = deckData.settings || {};
    const finalSettings = DeckSettingsSchema.parse({
      ...currentSettings,
      ...partialSettings,
    });

    // Update deck settings
    await deckRef.update({
      settings: finalSettings,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Deck settings updated successfully", {
      deckId,
      userId,
    });

    return serializeTimestamps({ success: true });
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
  const { userId, deckId } = request.data;

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

    const srcDeckRaw = srcDeckSnap.data();
    if (!srcDeckRaw) {
      throw new Error("Deck data is empty");
    }

    // Validate deck data structure
    const srcDeck = DeckSchema.parse({
      id: deckId,
      ...srcDeckRaw,
    });

    // Check if deck is deleted
    if (srcDeck.is_deleted === true) {
      throw new Error("Deck has been deleted");
    }

    // Create target user deck document (use same deckId for easier mapping)
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userDeckSnap = await userDeckRef.get();
    let userDeck: DeckLearningData | null = null;

    // If already exists, do not duplicate; return ok
    if (!userDeckSnap.exists) {
      const userDeckData: DeckLearningData = {
        id: deckId,
        title: srcDeck.title,
        cardsNum: srcDeck.cardsNum,
        settings: { zenMode: false } as DeckSettings,
        updatedAt: srcDeck.updatedAt,
      };
      // Validate before saving
      const validatedData = DeckLearningDataSchema.parse(userDeckData);

      await userDeckRef.set(validatedData);
      userDeck = validatedData;
      // Copy all cards from source deck to user's collection (full copy)
      const sourceCardsRef = srcDeckRef.collection("cards");
      const sourceCardsSnap = await sourceCardsRef.get();

      if (!sourceCardsSnap.empty) {
        const userCardsRef = userDeckRef.collection("cards");
        const batches: WriteBatch[] = [];
        let currentBatch = db.batch();
        let batchCount = 0;

        for (const sourceCardDoc of sourceCardsSnap.docs) {
          const sourceCardData = sourceCardDoc.data() as Card;

          const card: Card = {
            id: sourceCardDoc.id,
            cardData: {
              front: sourceCardData.cardData.front || "",
              back: sourceCardData.cardData.back || "",
            },
            tags: sourceCardData.tags || [],
            createdAt: sourceCardData.createdAt || new Date(),
            firstLearn: {
              isNew: true,
              due: new Date(),
            },
          };

          const validatedCard = CardSchema.parse(card);

          const userCardRef = userCardsRef.doc(sourceCardDoc.id);
          currentBatch.set(userCardRef, validatedCard, { merge: true });

          batchCount++;

          // Firestore batch limit is 500 operations
          if (batchCount >= 500) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            batchCount = 0;
          }
        }

        // Add the last batch if it has operations
        if (batchCount > 0) {
          batches.push(currentBatch);
        }

        // Commit all batches
        await Promise.all(batches.map((batch) => batch.commit()));

        logger.info("All cards copied to user space", {
          userId,
          deckId,
          cardsCount: sourceCardsSnap.size,
        });
      }
    }

    logger.info("Deck copied to user space", { userId, deckId });
    return serializeTimestamps({ success: true, deck: userDeck });
  } catch (error) {
    logger.error("Error starting learning deck", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to start learning deck");
  }
});

/**
 * Soft delete a deck - marks as deleted and notifies all users learning it
 */
export const deleteDeck = onCall(async (request) => {
  const { deckId } = request.data || {};
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

    const deckData = deckSnap.data() as Deck;

    // Check if user is the creator of the deck
    if (deckData.createdBy !== userId) {
      throw new Error("User does not have permission to delete this deck");
    }

    // Check if already deleted
    if (deckData.is_deleted) {
      return serializeTimestamps({
        success: true,
        message: "Deck already deleted",
      });
    }

    // Soft delete: set is_deleted flag
    await deckRef.update({
      is_deleted: true,
      deletedAt: FieldValue.serverTimestamp(),
    });

    // Find all users learning this deck using collection group query
    const learningUsersQuery = db
      .collectionGroup("decks")
      .where("id", "==", deckId);
    const learningUsersSnap = await learningUsersQuery.get();

    // Extract user IDs from document paths (users/{userId}/decks/{deckId})
    const userIds = new Set<string>();
    learningUsersSnap.docs.forEach((doc) => {
      const pathParts = doc.ref.path.split("/");
      if (pathParts.length >= 2 && pathParts[0] === "users") {
        userIds.add(pathParts[1]);
      }
    });

    // Send notifications to all users learning this deck
    const notificationPromises = Array.from(userIds).map((targetUserId) =>
      db.collection(`users/${targetUserId}/notifications`).add({
        title: "Deck usunięty",
        body: `Deck "${deckData.title}" został usunięty przez autora. Możesz kontynuować naukę w swojej bibliotece.`,
        type: "warning",
        linkTo: `/deck/${deckId}`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(notificationPromises);

    logger.info("Deck soft deleted successfully", {
      deckId,
      userId,
      notifiedUsers: userIds.size,
    });

    return serializeTimestamps({
      success: true,
      notifiedUsers: userIds.size,
    });
  } catch (error) {
    logger.error("Error deleting deck", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to delete deck");
  }
});

/**
 * Check for changes between source deck and user's local copy
 * Returns list of cards with differences
 */
export const checkCardChanges = onCall(async (request) => {
  const { userId, deckId } = request.data || {};

  if (!userId || !deckId) {
    throw new Error("userId and deckId are required");
  }

  try {
    // Get source deck cards
    const sourceDeckRef = db.collection("decks").doc(deckId);
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);

    const sourceDeckSnap = await sourceDeckRef.get();
    const userDeckSnap = await userDeckRef.get();

    if (!sourceDeckSnap.exists) {
      throw new Error("Source deck not found");
    }
    if (!userDeckSnap.exists) {
      throw new Error("User deck not found");
    }

    const sourceDeckData = sourceDeckSnap.data() as Deck;
    const userDeckData = userDeckSnap.data() as DeckLearningData;
    if (userDeckData.updatedAt == sourceDeckData.updatedAt) {
      return { changes: [] };
    }

    const sourceCardsSnap = await sourceDeckRef.collection("cards").get();
    const sourceCardsMap = new Map(
      sourceCardsSnap.docs.map((doc) => [doc.id, doc.data()])
    );

    // Get user's local cards
    const userCardsSnap = await userDeckRef.collection("cards").get();
    const userCardsMap = new Map(
      userCardsSnap.docs.map((doc) => [doc.id, doc.data()])
    );

    const changes: Array<{
      cardId: string;
      type: "modified" | "deleted" | "new";
      changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
    }> = [];

    // Check for modified or deleted cards
    for (const [cardId, userCardData] of userCardsMap.entries()) {
      const sourceCardData = sourceCardsMap.get(cardId);

      if (!sourceCardData) {
        // Card was deleted from source deck
        changes.push({
          cardId,
          type: "deleted",
        });
      } else {
        // Compare content fields
        const cardChanges: Array<{
          field: string;
          oldValue: unknown;
          newValue: unknown;
        }> = [];

        // Check front
        if (userCardData.front !== sourceCardData.front) {
          cardChanges.push({
            field: "front",
            oldValue: userCardData.front,
            newValue: sourceCardData.front,
          });
        }

        // Check back
        if (userCardData.back !== sourceCardData.back) {
          cardChanges.push({
            field: "back",
            oldValue: userCardData.back,
            newValue: sourceCardData.back,
          });
        }

        // Check tags (array comparison)
        const userTags = Array.isArray(userCardData.tags)
          ? [...userCardData.tags].sort()
          : [];
        const sourceTags = Array.isArray(sourceCardData.tags)
          ? [...sourceCardData.tags].sort()
          : [];
        if (JSON.stringify(userTags) !== JSON.stringify(sourceTags)) {
          cardChanges.push({
            field: "tags",
            oldValue: userCardData.tags,
            newValue: sourceCardData.tags,
          });
        }

        if (cardChanges.length > 0) {
          changes.push({
            cardId,
            type: "modified",
            changes: cardChanges,
          });
        }
      }
    }

    // Check for new cards (in source but not in user's copy)
    for (const [cardId] of sourceCardsMap.entries()) {
      if (!userCardsMap.has(cardId)) {
        changes.push({
          cardId,
          type: "new",
        });
      }
    }

    return { changes };
  } catch (error) {
    logger.error("Error checking card changes", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to check card changes");
  }
});

/**
 * Synchronize user's local card copies with source deck
 * Options: syncAll (all changes) or syncSelected (specific cardIds)
 */
export const syncDeckCards = onCall(async (request) => {
  const { userId, deckId, syncAll = false, cardIds = [] } = request.data || {};

  if (!userId || !deckId) {
    throw new Error("userId and deckId are required");
  }

  if (!syncAll && (!cardIds || cardIds.length === 0)) {
    throw new Error("Either syncAll must be true or cardIds must be provided");
  }

  try {
    // Get source deck cards
    const sourceDeckRef = db.collection("decks").doc(deckId);
    const sourceCardsSnap = await sourceDeckRef.collection("cards").get();
    const sourceCardsMap = new Map(
      sourceCardsSnap.docs.map((doc) => [doc.id, doc.data()])
    );

    // Get user's local cards
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userCardsRef = userDeckRef.collection("cards");
    const userCardsSnap = await userCardsRef.get();
    const userCardsMap = new Map(
      userCardsSnap.docs.map((doc) => [doc.id, doc.data()])
    );

    const now = new Date();
    let syncedCount = 0;
    const batch = db.batch();

    const sourceDeckSnap = await sourceDeckRef.get();
    const sourceDeckData = sourceDeckSnap.data() as DeckCore;
    const updatedAt = sourceDeckData.updatedAt;
    if (updatedAt) {
      batch.update(userDeckRef, {
        updatedAt: updatedAt,
      });
    }

    // Determine which cards to sync
    const cardsToSync = syncAll
      ? Array.from(userCardsMap.keys())
      : cardIds.filter((id: string) => userCardsMap.has(id));

    // Sync modified cards
    for (const cardId of cardsToSync) {
      const sourceCardData = sourceCardsMap.get(cardId);
      const userCardRef = userCardsRef.doc(cardId);

      if (sourceCardData) {
        // Waliduj i typuj dane karty
        const cardDataUpdate: CardDataUpdate = CardDataUpdateSchema.parse({
          front: sourceCardData.front || "",
          back: sourceCardData.back || "",
        });

        const cardCoreUpdate: CardCoreUpdate = CardCoreUpdateSchema.parse({
          cardData: cardDataUpdate,
          tags: Array.isArray(sourceCardData.tags) ? sourceCardData.tags : [],
        });

        // Update card content from source
        batch.update(userCardRef, {
          cardData: cardCoreUpdate.cardData,
          tags: cardCoreUpdate.tags,
          updatedAt: new Date(),
        });
        syncedCount++;
      }
      // If card doesn't exist in source (deleted), we keep user's copy
      // User can continue learning from their local copy
    }

    // Add new cards (in source but not in user's copy)
    if (syncAll) {
      for (const [cardId, sourceCardData] of sourceCardsMap.entries()) {
        if (!userCardsMap.has(cardId)) {
          // Waliduj i typuj dane karty
          const cardDataUpdate: CardDataUpdate = CardDataUpdateSchema.parse({
            front: sourceCardData.front || "",
            back: sourceCardData.back || "",
          });

          const cardCoreUpdate: CardCoreUpdate = CardCoreUpdateSchema.parse({
            cardData: cardDataUpdate,
            tags: Array.isArray(sourceCardData.tags) ? sourceCardData.tags : [],
          });

          const newCardRef = userCardsRef.doc(cardId);
          batch.set(
            newCardRef,
            {
              cardData: cardCoreUpdate.cardData,
              tags: cardCoreUpdate.tags,
              contentVersion: now.getTime(),
              sourceDeckId: deckId,
              // Initialize progress
              firstLearn: {
                isNew: true,
                due: new Date(),
                state: 0,
                consecutiveGood: 0,
              },
              grade: CardGrade.NotGraded,
              difficulty: 2.5,
              nextReviewInterval: 1,
            },
            { merge: true }
          );
          syncedCount++;
          if (syncedCount >= 500) {
            // Batch limit reached, commit and create new batch
            await batch.commit();
            syncedCount = 0;
            // Note: This will break the logic, but syncAll with >500 new cards is rare
            // Better to handle this properly if needed
          }
        }
      }
    }

    // Commit batch (Firestore batch limit is 500)
    if (syncedCount > 0) {
      if (syncedCount <= 500) {
        await batch.commit();
      } else {
        // Split into multiple batches if needed
        const batches: WriteBatch[] = [];
        let currentBatch = db.batch();
        let batchCount = 0;

        // Re-create batches
        for (const cardId of cardsToSync) {
          const sourceCardData = sourceCardsMap.get(cardId);
          const userCardRef = userCardsRef.doc(cardId);

          if (sourceCardData) {
            // Waliduj i typuj dane karty
            const cardDataUpdate: CardDataUpdate = CardDataUpdateSchema.parse({
              front: sourceCardData.front || "",
              back: sourceCardData.back || "",
            });

            const cardCoreUpdate: CardCoreUpdate = CardCoreUpdateSchema.parse({
              cardData: cardDataUpdate,
              tags: Array.isArray(sourceCardData.tags)
                ? sourceCardData.tags
                : [],
            });

            currentBatch.update(userCardRef, {
              cardData: cardCoreUpdate.cardData,
              tags: cardCoreUpdate.tags,
              contentVersion: now.getTime(),
            });
            batchCount++;

            if (batchCount >= 500) {
              batches.push(currentBatch);
              currentBatch = db.batch();
              batchCount = 0;
            }
          }
        }

        if (batchCount > 0) {
          batches.push(currentBatch);
        }

        await Promise.all(batches.map((b) => b.commit()));
      }
    }

    logger.info("Cards synchronized", {
      userId,
      deckId,
      syncedCount,
      syncAll,
    });

    return {
      success: true,
      syncedCount,
    };
  } catch (error) {
    logger.error("Error syncing deck cards", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to sync deck cards");
  }
});

/**
 * Update card content (cardData and tags) - only for source deck authors
 */
export const updateCardContent = onCall(async (request) => {
  const { userId, deckId, cardId, cardData } = request.data || {};

  if (!userId || !deckId || !cardId || !cardData) {
    throw new Error("userId, deckId, cardId, and cardData are required");
  }

  try {
    // Validate card data
    const validatedCardData = CardCoreUpdateSchema.parse(cardData);

    // Only allow updating source deck cards (user must be deck owner)
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new Error("Deck not found");
    }

    const deckData = deckSnap.data() as Deck;
    if (deckData.createdBy !== userId) {
      throw new Error("You don't have permission to edit this card");
    }

    const cardRef = deckRef.collection("cards").doc(cardId);
    const cardSnap = await cardRef.get();

    if (!cardSnap.exists) {
      throw new Error("Card not found");
    }

    // Update card
    await cardRef.update({
      cardData: validatedCardData.cardData,
      tags: validatedCardData.tags || [],
    });

    logger.info("Card content updated", {
      userId,
      deckId,
      cardId,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Error updating card content", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update card content");
  }
});
