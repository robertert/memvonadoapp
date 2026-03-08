import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue, WriteBatch } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { z } from "zod";
import {
  Card,
  CardCore,
  DeckLearningData,
  DeckSchema,
  DeckSettings,
  Deck,
  CardSchema,
  FirstLearn,
  DeckLearningDataSchema,
  CardCoreUpdateSchema,
  UserStats,
  UserStatsSchema,
  CardGrade,
  UserSchema,
  DeckSettingsUpdateSchema,
  CreateDeckWithCardsResponseSchema,
  GetDeckDetailsResponseSchema,
  GetDeckCardsResponseSchema,
  GetPopularDecksResponseSchema,
  GetUserDeckDetailsResponseSchema,
  GetUserDeckCardsResponseSchema,
  GetUserDueDeckCardsResponseSchema,
  GetUserNewDeckCardsResponseSchema,
  SuccessResponseSchema,
  StartLearningDeckResponseSchema,
  DeleteDeckResponseSchema,
  SyncDeckCardsResponseSchema,
  UpdateCardContentResponseSchema,
  UpdateDeckResponseSchema,
} from "../types/common";
import { serializeTimestamps } from "../utils/serialization";
import {
  CreateDeckWithCardsRequestSchema,
  GetDeckDetailsRequestSchema,
  GetDeckCardsRequestSchema,
  GetPopularDecksRequestSchema,
  GetUserDeckDetailsRequestSchema,
  GetUserDeckCardsRequestSchema,
  GetUserDueDeckCardsRequestSchema,
  GetUserNewDeckCardsRequestSchema,
  ResetDeckRequestSchema,
  UpdateDeckSettingsRequestSchema,
  UpdateUserDeckSettingsRequestSchema,
  StartLearningDeckRequestSchema,
  DeleteDeckRequestSchema,
  CheckCardChangesRequestSchema,
  SyncDeckCardsRequestSchema,
  UpdateCardContentRequestSchema,
  UpdateDeckRequestSchema,
  CheckCardChangesResponseSchema,
  ImportAnkiDeckRequestSchema,
  ImportAnkiDeckResponseSchema,
  StartLearningSessionResponseSchema,
  StartLearningSessionRequestSchema,
  GetDeckDailyStatsRequestSchema,
  GetDeckDailyStatsResponseSchema,
  GetDailyUserStatsResponseSchema,
  GetDailyUserStatsRequestSchema,
  RecordDeckViewRequestSchema,
  RecordDeckViewResponseSchema,
  ToggleDeckLikeRequestSchema,
  ToggleDeckLikeResponseSchema,
  CheckIfLikedRequestSchema,
  CheckIfLikedResponseSchema,
  AddCardToDeckRequestSchema,
  AddCardToDeckResponseSchema,
  SearchUsersRequestSchema,
  SearchUsersResponseSchema,
  AddDeckEditorRequestSchema,
  AddDeckEditorResponseSchema,
  RemoveDeckEditorRequestSchema,
  RemoveDeckEditorResponseSchema,
  GetDeckEditorsRequestSchema,
  GetDeckEditorsResponseSchema,
} from "memvocado-types/schemas/api/deck";
import { convertAnkiApkg } from "../ankiConverter";
import {
  DeckLearningDataUpdateSchema,
  NotificationSchema,
  User,
  UserDailyStats,
} from "memvocado-types";
import { FirestoreCardRepository } from "../repositories/firestore/FirestoreCardRepository";
import { FirestoreDeckRepository } from "../repositories/firestore/FirestoreDeckRepository";
import { FirestoreUserRepository } from "../repositories/firestore/FirestoreUserRepository";
import { FirestoreStatsRepository } from "../repositories/firestore/FirestoreStatsRepository";
import { LearnService } from "../services/LearnService";
import { DeckService } from "../services/DeckService";
import { StatsService } from "../services/StatsService";

const db = getFirestore();

const cardRepo = new FirestoreCardRepository();
const deckRepo = new FirestoreDeckRepository();
const userRepo = new FirestoreUserRepository();
const statsRepo = new FirestoreStatsRepository();

const learnService = new LearnService(cardRepo, deckRepo, userRepo, statsRepo);
const deckService = new DeckService(deckRepo, cardRepo);
const statsService = new StatsService(statsRepo, userRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Bulk create deck with cards
 */
export const createDeckWithCards = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  // Walidacja request.data
  const validationResult = CreateDeckWithCardsRequestSchema.safeParse(
    request.data
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckData, cards } = validationResult.data;
  const validatedDeckCore = deckData;
  const validatedCards = cards;

  try {
    // Firestore batch limit is 500 operations
    const BATCH_LIMIT = 500;

    // Create deck document
    const deckRef = db.collection("decks").doc();
    const deck = {
      id: deckRef.id,
      title: validatedDeckCore.title,
      title_lower: validatedDeckCore.title.toLowerCase(),
      category: validatedDeckCore.category ?? null,
      icon: validatedDeckCore.icon,
      cardsNum: validatedCards.length,
      createdBy: userId,
      createdAt: new Date(),
      isPublic: validatedDeckCore.isPublic,
      is_deleted: false,
      updatedAt: new Date(),
    } as Deck;

    const validatedDeck = DeckSchema.parse(deck);

    // Use batches to handle any number of cards (works for both small and large decks)
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchCount = 0;

    // Add deck to first batch
    currentBatch.set(deckRef, validatedDeck);
    batchCount++;

    validatedCards.forEach((validatedCardCore) => {
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
      currentBatch.set(cardRef, validatedCard);
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= BATCH_LIMIT) {
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

    logger.info("Deck created successfully", {
      deckId: deckRef.id,
      cardCount: validatedCards.length,
    });

    const response = { deckId: deckRef.id };
    const validatedResponse = CreateDeckWithCardsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error creating deck", error);
    handleZodError(error, "createDeckWithCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to create deck");
  }
});

/**
 * Get deck details only (without cards)
 */
export const getDeckDetails = onCall(async (request) => {
  const validationResult = GetDeckDetailsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const deckDataRaw = deckSnap.data();
    if (!deckDataRaw) {
      throw new HttpsError("not-found", "Deck not found");
    }
    const validatedDeckData = DeckSchema.parse({
      ...deckDataRaw,
      id: deckSnap.id,
    });

    const userRef = db.doc(`users/${deckDataRaw.createdBy}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const userData = UserSchema.parse({
      id: userSnap.id,
      ...userSnap.data(),
    });

    // Check if deck is deleted
    if (validatedDeckData.is_deleted === true) {
      throw new HttpsError("not-found", "Deck not found");
    }

    // Use document ID (override any id field in data)

    // Check if caller is an editor
    const callerId = request.auth?.uid;
    const isEditor = callerId
      ? (validatedDeckData.editors || []).includes(callerId)
      : false;

    const response = {
      deck: validatedDeckData,
      username: userData.username,
      isEditor,
    };
    const validatedResponse = GetDeckDetailsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting deck details", error);
    handleZodError(error, "getDeckDetails");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get deck details");
  }
});

/**
 * Get cards for a deck with pagination
 */
export const getDeckCards = onCall(async (request) => {
  const validationResult = GetDeckCardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, limit = 20, startAfter } = validationResult.data;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    let query = deckRef.collection("cards").limit(limit);

    if (startAfter && typeof startAfter === "string") {
      const startAfterDoc = await deckRef
        .collection("cards")
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const cardsSnap = await query.get();
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

    const validatedCards = cardsSnap.docs.map((doc) =>
      CardSchema.parse({
        id: doc.id,
        ...doc.data(),
      })
    );

    const response = {
      cards: validatedCards as Card[],
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    };
    const validatedResponse = GetDeckCardsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting deck cards", error);
    handleZodError(error, "getDeckCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get deck cards");
  }
});

/**
 * Get popular public decks
 */
export const getPopularDecks = onCall(async (request) => {
  const validationResult = GetPopularDecksRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { limit = 8 } = validationResult.data;

  try {
    const snapshot = await db
      .collection("decks")
      .where("isPublic", "==", true)
      .where("is_deleted", "==", false)
      .orderBy("views", "desc")
      .limit(limit)
      .get();

    const decks = snapshot.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id } as Deck)
    );
    const validatedDecks = decks.map((deck) => DeckSchema.parse(deck));

    const response = { decks: validatedDecks as Deck[] };
    const validatedResponse = GetPopularDecksResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting popular decks", error);
    handleZodError(error, "getPopularDecks");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get popular decks");
  }
});

/**
 * User-deck equivalents (operate on users/{userId}/decks/{deckId})
 */
export const getUserDeckDetails = onCall(async (request) => {
  const validationResult = GetUserDeckDetailsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  try {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();
    if (!deckSnap.exists) {
      const userDeck = await deckService.copyDeck(userId, deckId);
      const response = { deck: userDeck, createdDeck: true };
      const validatedResponse =
        GetUserDeckDetailsResponseSchema.parse(response);
      return serializeTimestamps(validatedResponse);
    }
    const deckData = {
      ...deckSnap.data(),
      id: deckSnap.id,
    };
    const validatedDeck = DeckLearningDataSchema.parse(deckData);
    const response = {
      deck: validatedDeck as DeckLearningData,
      createdDeck: false,
    };
    const validatedResponse = GetUserDeckDetailsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user deck details", error);
    handleZodError(error, "getUserDeckDetails");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user deck details");
  }
});

export const getUserDeckCards = onCall(async (request) => {
  const validationResult = GetUserDeckCardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, limit = 20, startAfter } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  if (limit && (typeof limit !== "number" || limit < 1 || limit > 1000)) {
    throw new HttpsError(
      "invalid-argument",
      "limit must be a number between 1 and 1000"
    );
  }
  try {
    // Verify user deck exists
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userDeckSnap = await userDeckRef.get();

    if (!userDeckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    // Get source deck cards with pagination
    let query = userDeckRef.collection("cards").limit(limit);
    if (startAfter && typeof startAfter === "string") {
      const startAfterDoc = await userDeckRef
        .collection("cards")
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    const cardsSnap = await query.get();

    // Check if there are more cards
    let hasMore = false;
    if (cardsSnap.docs.length === limit) {
      const lastDoc = cardsSnap.docs[cardsSnap.docs.length - 1];
      const nextQuery = userDeckRef
        .collection("cards")
        .startAfter(lastDoc)
        .limit(1);
      const nextSnap = await nextQuery.get();
      hasMore = nextSnap.docs.length > 0;
    }
    const validatedCards = cardsSnap.docs.map((doc) =>
      CardSchema.parse({
        id: doc.id,
        ...doc.data(),
      })
    );
    const response = {
      cards: validatedCards as Card[],
      hasMore,
      lastDocId:
        cardsSnap.docs.length > 0
          ? cardsSnap.docs[cardsSnap.docs.length - 1].id
          : null,
    };
    const validatedResponse = GetUserDeckCardsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user deck cards", error);
    handleZodError(error, "getUserDeckCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user deck cards");
  }
});

/**
 * @param {string} userId
 * @param {string} deckId
 * @return {Promise<Card[]>}
 */
async function getUserDueDeckCardsLocal(
  userId: string,
  deckId: string
): Promise<Card[]> {
  return cardRepo.getDueCards(userId, deckId);
}

export const getUserDueDeckCards = onCall(async (request) => {
  const validationResult = GetUserDueDeckCardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  try {
    const cards = await getUserDueDeckCardsLocal(userId, deckId);
    const response = { cards: cards as Card[] };
    const validatedResponse = GetUserDueDeckCardsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user due deck cards", error);
    handleZodError(error, "getUserDueDeckCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user due deck cards");
  }
});

/**
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<Card[]>} New cards
 */
async function getUserNewDeckCardsLocal(
  userId: string,
  deckId: string
): Promise<Card[]> {
  const deck = await deckRepo.getUserDeck(userId, deckId);
  if (!deck) throw new HttpsError("not-found", "Deck not found");
  const user = await userRepo.getUser(userId);
  const shuffleNewCards = (deck.settings as DeckSettings)?.shuffleNewCards ?? false;
  const effectiveLimit = deck.settings.newCardsNumPerDay
    ?? user?.settings?.dailyNew
    ?? 50;
  return cardRepo.getNewCards(userId, deckId, { effectiveLimit, shuffleNewCards });
}

export const getDeckDailyStats = onCall(async (request) => {
  const validationResult = GetDeckDailyStatsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const dailyStats = await statsService.getDeckDailyStatsToday(userId, deckId);
    if (!dailyStats) {
      return serializeTimestamps(
        GetDeckDailyStatsResponseSchema.parse({ dailyStats: null })
      );
    }
    const response = { dailyStats: dailyStats };
    const validatedResponse = GetDeckDailyStatsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting deck daily stats", error);
    handleZodError(error, "getDeckDailyStats");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get deck daily stats");
  }
});

/**
 * @param {string} userId - User ID
 * @return {Promise<User | null>} User data
 */
async function getUserData(userId: string): Promise<User | null> {
  return userRepo.getUser(userId);
}

export const getUserNewDeckCards = onCall(async (request) => {
  const validationResult = GetUserNewDeckCardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  try {
    // Verify user deck exists
    const cards = await getUserNewDeckCardsLocal(userId, deckId);
    const response = { cards: cards };
    const validatedResponse = GetUserNewDeckCardsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user new deck cards", error);
    handleZodError(error, "getUserNewDeckCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user new deck cards");
  }
});

export const startLearningSession = onCall(async (request) => {
  const parsed = StartLearningSessionRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = request.auth.uid;
  const { deckId } = parsed.data;

  try {
    const deck = await deckRepo.getUserDeck(userId, deckId);
    if (!deck) {
      await deckService.copyDeck(userId, deckId);
    }

    const result = await learnService.startSession({ userId, deckId });
    const validated = StartLearningSessionResponseSchema.parse(result);
    return serializeTimestamps(validated);
  } catch (e) {
    logger.error("Error starting learning session", e);
    handleZodError(e, "startLearningSession");
    if (e instanceof HttpsError) throw e;
    throw new HttpsError("internal", "Failed to start learning session");
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
      // Calculate totals from all user decks
      for (const deckDoc of decksSnapshot.docs) {
        const validatedDeck = DeckSchema.parse(deckDoc.data());
        totalCards += validatedDeck.cardsNum ?? 0;
      }

      const userStats: Partial<UserStats> = {
        totalCards: totalCards,
        totalDecks: decksSnapshot.size,
        lastStudyDate: new Date(),
      };

      const validatedUserStats = UserStatsSchema.parse(userStats);

      await db.doc(`users/${userId}`).update({
        "stats.totalCards": FieldValue.increment(validatedUserStats.totalCards),
        "stats.totalDecks": FieldValue.increment(validatedUserStats.totalDecks),
        "stats.lastStudyDate": validatedUserStats.lastStudyDate,
      });

      logger.info("User stats updated succssfully", {
        userId,
        totalCards,
        totalDecks: decksSnapshot.size,
      });
    } catch (error) {
      logger.error("Error updating user stats", error);
    }
  }
);

/**
 * Return daily user stats and updated when new day starts
 * @param {string} userId - User ID
 * @return {Promise<UserDailyStats | null>} Daily stats
 */
async function getDailyUserStatsLocal(
  userId: string
): Promise<UserDailyStats | null> {
  return statsService.getUserDailyStatsToday(userId);
}

export const getDailyUserStats = onCall(async (request) => {
  const validationResult = GetDailyUserStatsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const dailyStats = await getDailyUserStatsLocal(userId);
    const response = { dailyStats: dailyStats };
    const validatedResponse = GetDailyUserStatsResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting daily user stats", error);
    handleZodError(error, "getDailyUserStats");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get daily user stats");
  }
});

/**
 * Sync denormalized fields (category, icon, tags) to all user copies when source deck is updated
 * Triggered on write to decks/{deckId}
 */
export const syncDeckMetadataToUserCopies = onDocumentWritten(
  "decks/{deckId}",
  async (event) => {
    const deckId = event.params.deckId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Skip if document was deleted
    if (!afterData) {
      logger.info("Deck deleted, skipping sync", { deckId });
      return;
    }

    // Validate source deck data
    let validatedAfterData: Deck;
    try {
      validatedAfterData = DeckSchema.parse({
        id: deckId,
        ...afterData,
      });
    } catch (error) {
      logger.error("Invalid deck data, skipping sync", {
        deckId,
        error,
      });
      return;
    }

    // Check if category, icon, tags, or title changed
    const beforeTitle = beforeData?.title ?? "";
    const afterTitle = validatedAfterData.title ?? "";
    const titleChanged = beforeTitle !== afterTitle;

    const beforeCategory = beforeData?.category ?? null;
    const afterCategory = validatedAfterData.category ?? null;
    const categoryChanged = beforeCategory !== afterCategory;

    const beforeIcon = beforeData?.icon ?? "cards";
    const afterIcon = validatedAfterData.icon ?? "cards";
    const iconChanged = beforeIcon !== afterIcon;

    const beforeTags = Array.isArray(beforeData?.tags)
      ? [...beforeData.tags].sort()
      : [];
    const afterTags = Array.isArray(validatedAfterData.tags)
      ? [...validatedAfterData.tags].sort()
      : [];
    const tagsChanged =
      JSON.stringify(beforeTags) !== JSON.stringify(afterTags);

    const beforeFrontLanguage = beforeData?.frontLanguage ?? null;
    const afterFrontLanguage = validatedAfterData.frontLanguage ?? null;
    const frontLanguageChanged = beforeFrontLanguage !== afterFrontLanguage;

    const beforeBackLanguage = beforeData?.backLanguage ?? null;
    const afterBackLanguage = validatedAfterData.backLanguage ?? null;
    const backLanguageChanged = beforeBackLanguage !== afterBackLanguage;

    // If nothing changed, skip
    if (!categoryChanged && !iconChanged && !tagsChanged && !titleChanged && !frontLanguageChanged && !backLanguageChanged) {
      logger.debug("No metadata changes detected, skipping sync", { deckId });
      return;
    }

    try {
      // Prepare update data with only changed fields
      const updateData: {
        category?: string | null;
        icon?: string;
        tags?: string[];
        title?: string;
        title_lower?: string;
        frontLanguage?: string | null;
        backLanguage?: string | null;
        updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      } = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (titleChanged) {
        updateData.title = afterTitle;
        updateData.title_lower = afterTitle.toLowerCase();
      }
      if (categoryChanged) {
        updateData.category = afterCategory;
      }
      if (iconChanged) {
        updateData.icon = afterIcon;
      }
      if (tagsChanged) {
        updateData.tags = validatedAfterData.tags;
      }
      if (frontLanguageChanged) {
        updateData.frontLanguage = afterFrontLanguage;
      }
      if (backLanguageChanged) {
        updateData.backLanguage = afterBackLanguage;
      }

      // Find all users who have a copy of this deck
      // We need to query all users/{userId}/decks/{deckId} collections
      // Since Firestore doesn't support wildcard queries across collections,
      // we'll use a collection group query
      // NOTE: Requires index on collectionGroup "decks" with field "id"
      let userDeckCopies;
      try {
        userDeckCopies = await db
          .collectionGroup("decks")
          .where("id", "==", deckId)
          .get();
      } catch (queryError) {
        // Check if it's an index error
        if (
          queryError instanceof Error &&
          queryError.message.includes("index")
        ) {
          logger.error(
            "Collection group query requires index. Please create index for collectionGroup 'decks' with field 'id'",
            {
              deckId,
              error: queryError.message,
            }
          );
        } else {
          logger.error("Error executing collection group query", {
            deckId,
            error:
              queryError instanceof Error
                ? queryError.message
                : String(queryError),
          });
        }
        // Don't throw - we don't want to fail the source deck update
        return;
      }

      if (userDeckCopies.empty) {
        logger.info("No user copies found for deck", { deckId });
        return;
      }

      // Use batches to update all copies (Firestore batch limit is 500)
      const batches: WriteBatch[] = [];
      let currentBatch = db.batch();
      let batchCount = 0;
      let updatedCount = 0;

      for (const userDeckDoc of userDeckCopies.docs) {
        // Validate that this is actually a user deck copy
        // Collection group query returns docs from users/{userId}/decks/{deckId}
        const pathParts = userDeckDoc.ref.path.split("/");
        if (pathParts.length !== 4 || pathParts[0] !== "users") {
          logger.warn("Invalid path structure in collection group query", {
            path: userDeckDoc.ref.path,
          });
          continue;
        }

        const userIdFromPath = pathParts[1];
        const deckIdFromPath = pathParts[3];

        // Verify deckId from path matches the source deckId
        if (deckIdFromPath !== deckId) {
          logger.warn("Deck ID from path doesn't match source deck ID", {
            pathDeckId: deckIdFromPath,
            sourceDeckId: deckId,
            path: userDeckDoc.ref.path,
          });
          continue;
        }

        // Validate existing user deck data before update
        const existingUserDeckData = userDeckDoc.data();
        if (!existingUserDeckData) {
          logger.warn("User deck document has no data", {
            userId: userIdFromPath,
            deckId: deckIdFromPath,
            path: userDeckDoc.ref.path,
          });
          continue;
        }

        try {
          // Use deckId from path (which should match the source deckId)
          // The 'id' field in the document should also match, but we verify from path
          const validatedUserDeck = DeckLearningDataSchema.parse({
            ...existingUserDeckData,
            id: deckIdFromPath, // Use deckId from path, not document ID
          });

          // Double-check: the id field in document should match
          if (validatedUserDeck.id !== deckId) {
            logger.warn("User deck ID field doesn't match source deck ID", {
              userDeckId: validatedUserDeck.id,
              sourceDeckId: deckId,
              path: userDeckDoc.ref.path,
            });
            continue;
          }

          currentBatch.update(userDeckDoc.ref, updateData);
          updatedCount++;
          batchCount++;

          // Firestore batch limit is 500 operations
          if (batchCount >= 500) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            batchCount = 0;
          }
        } catch (validationError) {
          logger.error("Invalid user deck data, skipping update", {
            userId: userIdFromPath,
            deckId: deckIdFromPath,
            path: userDeckDoc.ref.path,
            error:
              validationError instanceof Error
                ? validationError.message
                : String(validationError),
            errorStack:
              validationError instanceof Error
                ? validationError.stack
                : undefined,
          });
          continue;
        }
      }

      // Add the last batch if it has operations
      if (batchCount > 0) {
        batches.push(currentBatch);
      }

      // Commit all batches
      if (batches.length > 0) {
        await Promise.all(batches.map((batch) => batch.commit()));
        logger.info("Synced deck metadata to user copies", {
          deckId,
          updatedCount,
          categoryChanged,
          iconChanged,
          tagsChanged,
          frontLanguageChanged,
          backLanguageChanged,
        });
      } else {
        logger.info("No valid user copies to update", { deckId });
      }
    } catch (error) {
      logger.error("Error syncing deck metadata to user copies", {
        deckId,
        error,
      });
      // Don't throw - we don't want to fail the source deck update
    }
  }
);

/**
 * Reset deck progress - removes all card progress data
 */

export const resetDeck = onCall(async (request) => {
  const validationResult = ResetDeckRequestSchema.safeParse(request.data || {});
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }

  try {
    // Verify user owns the deck
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const cardsRef = deckRef.collection("cards");

    // Get all cards in the deck
    const cardsSnapshot = await cardsRef.get();

    if (cardsSnapshot.empty) {
      logger.info("No cards found in deck", { deckId });
      const response = { success: true };
      const validatedResponse = SuccessResponseSchema.parse(response);
      return serializeTimestamps(validatedResponse);
    }

    // Use batch to update all cards (Firestore batch limit is 500)
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    let cardsReset = 0;

    currentBatch.update(
      deckRef,
      DeckLearningDataUpdateSchema.parse({
        dailyStats: null,
      })
    );

    batchCount++;
    cardsSnapshot.forEach((doc) => {
      const cardRef = cardsRef.doc(doc.id);
      currentBatch.update(cardRef, {
        cardAlgo: FieldValue.delete(),
        cardAlgoReverse: FieldValue.delete(),
        firstLearn: {
          isNew: true,
        },
        firstLearnReverse: FieldValue.delete(),
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

    const response = { success: true };
    const validatedResponse = SuccessResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error resetting deck progress", error);
    handleZodError(error, "resetDeck");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to reset deck progress");
  }
});

/**
 * Update deck settings
 */
export const updateDeckSettings = onCall(async (request) => {
  const validationResult = UpdateDeckSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, deck } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  if (!deck || typeof deck !== "object") {
    throw new HttpsError("invalid-argument", "deck is required");
  }

  try {
    // Verify user owns the deck
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const rawDeckData = deckSnap.data();
    if (!rawDeckData) {
      throw new HttpsError("not-found", "Deck not found");
    }
    const validatedDeckData = DeckSchema.parse(rawDeckData);

    // Check if user is the creator of the deck or an admin
    if (validatedDeckData.createdBy !== userId && !(await isAdmin(userId))) {
      throw new HttpsError(
        "permission-denied",
        "User does not have permission"
      );
    }

    // Waliduj i typuj częściową aktualizację ustawień (whitelist pól)
    const validatedDeck = DeckSchema.parse(deck);

    // Porównaj z obecnymi danymi i zbuduj update tylko dla zmienionych pól
    const updateData: {
      [key: string]: unknown;
    } = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Sprawdź które pola się zmieniły i dodaj tylko te do updateData
    if (
      validatedDeck.title !== undefined &&
      validatedDeck.title !== validatedDeckData.title
    ) {
      updateData.title = validatedDeck.title;
    }

    if (
      validatedDeck.category !== undefined &&
      validatedDeck.category !== validatedDeckData.category
    ) {
      updateData.category = validatedDeck.category;
    }

    if (
      validatedDeck.icon !== undefined &&
      validatedDeck.icon !== validatedDeckData.icon
    ) {
      updateData.icon = validatedDeck.icon;
    }

    if (
      validatedDeck.tags !== undefined &&
      JSON.stringify(validatedDeck.tags || []) !==
      JSON.stringify(validatedDeckData.tags || [])
    ) {
      updateData.tags = validatedDeck.tags;
    }

    if (
      validatedDeck.isPublic !== undefined &&
      validatedDeck.isPublic !== validatedDeckData.isPublic
    ) {
      updateData.isPublic = validatedDeck.isPublic;
    }

    // Aktualizuj tylko jeśli są jakieś zmiany (poza updatedAt)
    if (Object.keys(updateData).length > 1) {
      await deckRef.update(updateData);
    }

    logger.info("Deck settings updated successfully", {
      deckId,
      userId,
    });

    const response = { success: true };
    const validatedResponse = SuccessResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error updating deck settings", error);
    handleZodError(error, "updateDeckSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update deck settings");
  }
});

/**
 * Update user deck settings
 */
export const updateUserDeckSettings = onCall(async (request) => {
  const validationResult = UpdateUserDeckSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, settings } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  if (!settings || typeof settings !== "object") {
    throw new HttpsError("invalid-argument", "deck is required");
  }

  try {
    // Verify user owns the deck
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const currentDeckData = deckSnap.data() as DeckLearningData;

    // Waliduj i typuj częściową aktualizację ustawień (whitelist pól)
    const validatedSettings = DeckSettingsUpdateSchema.parse(settings);

    await deckRef.update({
      settings: {
        ...currentDeckData.settings,
        ...validatedSettings,
      },
    });

    logger.info("User deck settings updated successfully", {
      deckId,
      userId,
    });

    const response = { success: true };
    const validatedResponse = SuccessResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error updating user deck settings", error);
    handleZodError(error, "updateUserDeckSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update user deck settings");
  }
});

/**
 * Copy a public deck into user's personal space to track individual progress
 * Source: decks/{deckId}
 * Target: users/{userId}/decks/{deckId} + cards
 */
export const startLearningDeck = onCall(async (request) => {
  const validationResult = StartLearningDeckRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }

  try {
    const userDeck = await deckService.copyDeck(userId, deckId);
    const response = { success: true, deck: userDeck };
    const validatedResponse = StartLearningDeckResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error starting learning deck", error);
    handleZodError(error, "startLearningDeck");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to start learning deck");
  }
});

/**
 * Soft delete a deck - marks as deleted and notifies all users learning it
 */
export const deleteDeck = onCall(async (request) => {
  const validationResult = DeleteDeckRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    // Verify user owns the deck
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const rawDeckData = deckSnap.data();
    if (!rawDeckData) {
      throw new HttpsError("not-found", "Deck not found");
    }
    const validatedDeckData = DeckSchema.parse(rawDeckData);

    // Check if user is the creator of the deck or an admin
    if (validatedDeckData.createdBy !== userId && !(await isAdmin(userId))) {
      throw new HttpsError(
        "permission-denied",
        "User does not have permission to delete this deck"
      );
    }

    // Check if already deleted
    if (validatedDeckData.is_deleted) {
      const response = {
        success: true,
        notifiedUsers: 0,
      };
      const validatedResponse = DeleteDeckResponseSchema.parse(response);
      return serializeTimestamps(validatedResponse);
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
        body: `Deck "${validatedDeckData.title}" został usunięty przez autora. Możesz kontynuować naukę w swojej bibliotece.`,
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

    const response = {
      success: true,
      notifiedUsers: userIds.size,
    };
    const validatedResponse = DeleteDeckResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error deleting deck", error);
    handleZodError(error, "deleteDeck");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to delete deck");
  }
});

/**
 * Check for changes between source deck and user's local copy
 * Returns list of cards with differences
 */
export const checkCardChanges = onCall(async (request) => {
  const validationResult = CheckCardChangesRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }

  try {
    // Get source deck cards
    const sourceDeckRef = db.collection("decks").doc(deckId);
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);

    const sourceDeckSnap = await sourceDeckRef.get();
    const userDeckSnap = await userDeckRef.get();

    if (!sourceDeckSnap.exists) {
      throw new HttpsError("not-found", "Source deck not found");
    }
    if (!userDeckSnap.exists) {
      throw new HttpsError("not-found", "User deck not found");
    }

    const rawSourceDeckData = sourceDeckSnap.data();
    const rawUserDeckData = userDeckSnap.data();
    if (!rawSourceDeckData || !rawUserDeckData) {
      throw new HttpsError("not-found", "Deck data not found");
    }
    const validatedSourceDeckData = DeckSchema.parse(rawSourceDeckData);
    const validatedUserDeckData = DeckLearningDataSchema.parse(rawUserDeckData);
    if (validatedUserDeckData.updatedAt == validatedSourceDeckData.updatedAt) {
      const response = { changes: [] };
      const validatedResponse = CheckCardChangesResponseSchema.parse(response);
      return validatedResponse;
    }

    const sourceCardsSnap = await sourceDeckRef.collection("cards").get();
    const sourceCardsMap = new Map(
      sourceCardsSnap.docs.map((doc) => {
        const rawData = doc.data();
        const validatedData = CardSchema.parse({
          id: doc.id,
          ...rawData,
        });
        return [doc.id, validatedData];
      })
    );

    // Get user's local cards
    const userCardsSnap = await userDeckRef.collection("cards").get();
    const userCardsMap = new Map(
      userCardsSnap.docs.map((doc) => {
        const rawData = doc.data();
        const validatedData = CardSchema.parse({
          id: doc.id,
          ...rawData,
        });
        return [doc.id, validatedData];
      })
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
        if (userCardData.cardData.front !== sourceCardData.cardData.front) {
          cardChanges.push({
            field: "front",
            oldValue: userCardData.cardData.front,
            newValue: sourceCardData.cardData.front,
          });
        }

        // Check back
        if (userCardData.cardData.back !== sourceCardData.cardData.back) {
          cardChanges.push({
            field: "back",
            oldValue: userCardData.cardData.back,
            newValue: sourceCardData.cardData.back,
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

    const response = { changes };
    const validatedResponse = CheckCardChangesResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    logger.error("Error checking card changes", error);
    handleZodError(error, "checkCardChanges");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to check card changes");
  }
});

/**
 * Synchronize user's local card copies with source deck
 * Options: syncAll (all changes) or syncSelected (specific cardIds)
 */
export const syncDeckCards = onCall(async (request) => {
  const validationResult = SyncDeckCardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, syncAll = false, cardIds = [] } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }

  if (!syncAll && (!Array.isArray(cardIds) || cardIds.length === 0)) {
    throw new HttpsError(
      "invalid-argument",
      "Either syncAll must be true or cardIds must be provided"
    );
  }

  try {
    const sourceDeckRef = db.collection("decks").doc(deckId);
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userCardsRef = userDeckRef.collection("cards");

    const [sourceDeckSnap, sourceCardsSnap, userCardsSnap] = await Promise.all([
      sourceDeckRef.get(),
      sourceDeckRef.collection("cards").get(),
      userCardsRef.get(),
    ]);

    if (!sourceDeckSnap.exists) {
      throw new HttpsError("not-found", "Source deck not found");
    }

    const rawSourceDeckData = sourceDeckSnap.data();
    if (!rawSourceDeckData) {
      throw new HttpsError("not-found", "Source deck not found");
    }
    const validatedSourceDeckData = DeckSchema.parse(rawSourceDeckData);

    const sourceCardsMap = new Map(
      sourceCardsSnap.docs.map((doc) => {
        const parsedCard = CardSchema.parse({
          id: doc.id,
          ...doc.data(),
        });

        const sanitizedCore = CardCoreUpdateSchema.parse({
          cardData: {
            front: parsedCard.cardData.front || "",
            back: parsedCard.cardData.back || "",
          },
          tags: Array.isArray(parsedCard.tags) ? parsedCard.tags : [],
        });

        return [
          doc.id,
          {
            parsedCard,
            sanitizedCore,
          },
        ];
      })
    );

    const userCardIds = new Set(userCardsSnap.docs.map((doc) => doc.id));

    const cardsToSync = syncAll
      ? Array.from(userCardIds)
      : cardIds.filter((id: string) => userCardIds.has(id));

    const now = new Date();
    let syncedCount = 0;
    let deletedCount = 0;

    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const enqueue = (mutate: (batch: WriteBatch) => void) => {
      mutate(currentBatch);
      operationCount++;
      if (operationCount >= 450) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    };

    cardsToSync.forEach((cardId) => {
      const sourceCard = sourceCardsMap.get(cardId);

      if (!sourceCard) {
        return;
      }

      const { sanitizedCore } = sourceCard;
      const tags = sanitizedCore.tags ?? [];
      enqueue((batch) =>
        batch.update(userCardsRef.doc(cardId), {
          cardData: sanitizedCore.cardData,
          tags,
          updatedAt: now,
        })
      );
      syncedCount++;
    });

    if (syncAll) {
      // Add new cards from source that user doesn't have
      sourceCardsMap.forEach(({ parsedCard, sanitizedCore }, cardId) => {
        if (userCardIds.has(cardId)) {
          return;
        }

        const tags = sanitizedCore.tags ?? [];
        const newCard = CardSchema.parse({
          ...parsedCard,
          id: cardId,
          cardData: sanitizedCore.cardData,
          tags,
          createdAt: parsedCard.createdAt || now,
          firstLearn: {
            isNew: true,
            due: now,
            consecutiveGood: 0,
          },
          grade: CardGrade.NotGraded,
        });

        enqueue((batch) =>
          batch.set(userCardsRef.doc(cardId), newCard, { merge: true })
        );
        syncedCount++;
      });

      // Delete cards that user has but source doesn't have anymore
      userCardIds.forEach((userCardId) => {
        if (!sourceCardsMap.has(userCardId)) {
          enqueue((batch) => batch.delete(userCardsRef.doc(userCardId)));
          deletedCount++;
        }
      });
    }

    // Calculate final cardsNum after sync
    const finalCardsNum = sourceCardsMap.size;

    // Update user deck with new cardsNum and updatedAt
    enqueue((batch) =>
      batch.update(userDeckRef, {
        cardsNum: finalCardsNum,
        updatedAt: validatedSourceDeckData.updatedAt || now,
      })
    );

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    if (batches.length > 0) {
      await Promise.all(batches.map((batch) => batch.commit()));
    }

    logger.info("Cards synchronized", {
      userId,
      deckId,
      syncedCount,
      deletedCount,
      finalCardsNum,
      syncAll,
    });

    const validatedResponse = SyncDeckCardsResponseSchema.parse({
      success: true,
      syncedCount,
    });
    return validatedResponse;
  } catch (error) {
    logger.error("Error syncing deck cards", error);
    handleZodError(error, "syncDeckCards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to sync deck cards");
  }
});

/**
 * Check if user is admin
 * @param {string} userId - User ID
 * @return {Promise<boolean>} True if user is admin, false otherwise
 */
async function isAdmin(userId: string): Promise<boolean> {
  const adminSnap = await db.doc(`admin/roles/admins/${userId}`).get();
  return adminSnap.exists;
}

/**
 * Update card content (cardData and tags) - only for source deck authors
 */
export const updateCardContent = onCall(async (request) => {
  const validationResult = UpdateCardContentRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, cardId, cardData } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  if (!deckId || typeof deckId !== "string") {
    throw new HttpsError("invalid-argument", "deckId is required");
  }
  if (!cardId || typeof cardId !== "string") {
    throw new HttpsError("invalid-argument", "cardId is required");
  }
  if (!cardData || typeof cardData !== "object") {
    throw new HttpsError("invalid-argument", "cardData is required");
  }

  try {
    // Validate card data
    const validatedCardData = CardCoreUpdateSchema.parse(cardData);

    // Only allow updating source deck cards (user must be deck owner)
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const rawDeckData = deckSnap.data();
    if (!rawDeckData) {
      throw new HttpsError("not-found", "Deck not found");
    }
    const validatedDeckData = DeckSchema.parse(rawDeckData);
    const isOwner = validatedDeckData.createdBy === userId;
    const isEditorUser = (validatedDeckData.editors || []).includes(userId);
    if (!isOwner && !isEditorUser && !(await isAdmin(userId))) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to edit this card"
      );
    }

    const cardRef = deckRef.collection("cards").doc(cardId);
    const cardSnap = await cardRef.get();

    if (!cardSnap.exists) {
      throw new HttpsError("not-found", "Card not found");
    }

    // Update card in source deck
    await cardRef.update({
      cardData: validatedCardData.cardData,
      tags: validatedCardData.tags || [],
    });

    // Also update the user's learning copy if it exists
    const userCardRef = db
      .collection("users").doc(userId)
      .collection("decks").doc(deckId)
      .collection("cards").doc(cardId);
    const userCardSnap = await userCardRef.get();
    if (userCardSnap.exists) {
      await userCardRef.update({
        cardData: validatedCardData.cardData,
        tags: validatedCardData.tags || [],
      });
    }

    logger.info("Card content updated", {
      userId,
      deckId,
      cardId,
    });

    const response = {
      success: true,
    };
    const validatedResponse = UpdateCardContentResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    logger.error("Error updating card content", error);
    handleZodError(error, "updateCardContent");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update card content");
  }
});

/**
 * Update deck with cards - accepts only changes (no card fetching)
 * Optimized to avoid Firestore reads by accepting client-side diffing
 */
export const updateDeck = onCall(async (request) => {
  const validationResult = UpdateDeckRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, deckData, changes } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const rawDeckData = deckSnap.data();
    if (!rawDeckData) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const validatedDeckData = DeckSchema.parse(rawDeckData);

    // Permission check: owner, editor, or admin
    const isOwner = validatedDeckData.createdBy === userId;
    const isEditorUser = (validatedDeckData.editors || []).includes(userId);
    const isAdminUser = !isOwner && !isEditorUser ? await isAdmin(userId) : false;

    if (!isOwner && !isEditorUser && !isAdminUser) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to edit this deck"
      );
    }

    // Editors can only modify cards, not deck metadata
    const hasDeckDataChanges =
      deckData.title !== validatedDeckData.title ||
      deckData.category !== (validatedDeckData.category ?? null) ||
      deckData.icon !== validatedDeckData.icon ||
      deckData.isPublic !== validatedDeckData.isPublic ||
      JSON.stringify(deckData.tags || []) !== JSON.stringify(validatedDeckData.tags || []) ||
      (deckData.frontLanguage ?? null) !== (validatedDeckData.frontLanguage ?? null) ||
      (deckData.backLanguage ?? null) !== (validatedDeckData.backLanguage ?? null);

    if (isEditorUser && !isOwner && !isAdminUser && hasDeckDataChanges) {
      throw new HttpsError(
        "permission-denied",
        "Editors can only modify cards, not deck metadata"
      );
    }

    // Calculate final card count: current count + created - deleted
    // Note: updated cards don't change the count
    const currentCardCount = validatedDeckData.cardsNum || 0;
    const finalCardCount =
      currentCardCount + changes.created.length - changes.deleted.length;

    // Firestore batch limit is 500 operations
    const BATCH_LIMIT = 500;
    const totalOps =
      changes.deleted.length +
      changes.updated.length +
      changes.created.length +
      1; // +1 for deck update

    // Prepare deck update
    const deckUpdate: Record<string, unknown> = {
      title: deckData.title,
      title_lower: deckData.title.toLowerCase(),
      category: deckData.category ?? null,
      icon: deckData.icon,
      isPublic: deckData.isPublic,
      tags: deckData.tags || [],
      updatedAt: new Date(),
      cardsNum: finalCardCount,
    };

    // Add frontLanguage and backLanguage if they exist in deckData
    if ("frontLanguage" in deckData) {
      deckUpdate.frontLanguage = deckData.frontLanguage ?? null;
    }
    if ("backLanguage" in deckData) {
      deckUpdate.backLanguage = deckData.backLanguage ?? null;
    }

    // If operations exceed batch limit, split into multiple batches
    if (totalOps > BATCH_LIMIT) {
      // Process in chunks
      const allOperations: Array<{
        type: "delete" | "update" | "create";
        cardId?: string;
        card?: CardCore;
        cardWithId?: CardCore & { id: string };
      }> = [];

      // Add delete operations
      changes.deleted.forEach((cardId) => {
        allOperations.push({ type: "delete", cardId });
      });

      // Add update operations
      changes.updated.forEach((card) => {
        allOperations.push({ type: "update", cardWithId: card });
      });

      // Add create operations
      changes.created.forEach((card) => {
        allOperations.push({ type: "create", card });
      });

      // Process in batches of 499 (leaving 1 for deck update)
      const chunkSize = BATCH_LIMIT - 1;
      for (let i = 0; i < allOperations.length; i += chunkSize) {
        const chunk = allOperations.slice(i, i + chunkSize);
        const batch = db.batch();

        // Add deck update to first batch only
        if (i === 0) {
          batch.update(deckRef, deckUpdate);
        }

        chunk.forEach(
          (op: {
            type: "delete" | "update" | "create";
            cardId?: string;
            card?: CardCore;
            cardWithId?: CardCore & { id: string };
          }) => {
            if (op.type === "delete" && op.cardId) {
              const cardRef = deckRef.collection("cards").doc(op.cardId);
              batch.delete(cardRef);
            } else if (op.type === "update" && op.cardWithId) {
              const cardRef = deckRef.collection("cards").doc(op.cardWithId.id);
              batch.update(cardRef, {
                cardData: op.cardWithId.cardData,
                tags: op.cardWithId.tags || [],
              });
            } else if (op.type === "create" && op.card) {
              const cardRef = deckRef.collection("cards").doc();
              const cardData = {
                ...op.card,
                createdAt: new Date(),
                firstLearn: {
                  isNew: true,
                } as FirstLearn,
              } as Card;

              const validatedCard = CardSchema.parse({
                ...cardData,
                id: cardRef.id,
              });
              batch.set(cardRef, validatedCard);
            }
          }
        );

        await batch.commit();
      }
    } else {
      // Single batch - all operations fit
      const batch = db.batch();

      // Update deck
      batch.update(deckRef, deckUpdate);

      // Delete cards
      changes.deleted.forEach((cardId: string) => {
        const cardRef = deckRef.collection("cards").doc(cardId);
        batch.delete(cardRef);
      });

      // Update cards
      changes.updated.forEach((card: CardCore & { id: string }) => {
        const cardRef = deckRef.collection("cards").doc(card.id);
        batch.update(cardRef, {
          cardData: card.cardData,
          tags: card.tags || [],
        });
      });

      // Create new cards
      changes.created.forEach((card: CardCore) => {
        const cardRef = deckRef.collection("cards").doc();
        const cardData = {
          ...card,
          createdAt: new Date(),
          firstLearn: {
            isNew: true,
          } as FirstLearn,
        } as Card;

        const validatedCard = CardSchema.parse({
          ...cardData,
          id: cardRef.id,
        });
        batch.set(cardRef, validatedCard);
      });

      await batch.commit();
    }

    logger.info("Deck updated successfully", {
      userId,
      deckId,
      updatedCount: changes.updated.length,
      createdCount: changes.created.length,
      deletedCount: changes.deleted.length,
    });

    const response = {
      success: true,
      updatedCount: changes.updated.length,
      createdCount: changes.created.length,
      deletedCount: changes.deleted.length,
    };
    const validatedResponse = UpdateDeckResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    logger.error("Error updating deck", error);
    handleZodError(error, "updateDeck");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update deck");
  }
});

/**
 * Import Anki deck (.apkg file) and convert to Memvocado cards
 */
export const importAnkiDeck = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Walidacja request
  const validationResult = ImportAnkiDeckRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { storagePath, title } = validationResult.data;

  try {
    const userId = auth.uid;

    const bucket = getStorage().bucket();
    const [fileBuffer] = await bucket.file(storagePath).download();

    const cards = await convertAnkiApkg(fileBuffer);

    logger.info("Anki deck imported successfully", {
      userId,
      cardCount: cards.length,
    });

    // Firestore batch limit is 500 operations
    const BATCH_LIMIT = 500;

    // Create deck document with default data
    const deckRef = db.collection("decks").doc();
    const deck = {
      id: deckRef.id,
      title: title || "Imported from Anki",
      category: null,
      icon: "cards",
      cardsNum: cards.length,
      createdBy: userId,
      createdAt: new Date(),
      isPublic: false,
      is_deleted: false,
      updatedAt: new Date(),
    } as Deck;

    const validatedDeck = DeckSchema.parse(deck);

    const userDeckRef = db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .doc(deckRef.id);

    const userDeck = {
      id: userDeckRef.id,
      title: title,
      category: null,
      icon: "cards",
      cardsNum: cards.length,
      settings: {
        zenMode: false,
        shuffleNewCards: false,
      } as DeckSettings,
      updatedAt: new Date(),
    };

    const validatedUserDeck = DeckLearningDataSchema.parse(userDeck);

    // Use batches to handle any number of cards (works for both small and large decks)
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let batchCount = 0;

    // Add deck to first batch
    currentBatch.set(deckRef, validatedDeck);
    batchCount++;
    currentBatch.set(userDeckRef, validatedUserDeck);
    batchCount++;

    cards.forEach((card) => {
      const cardRef = deckRef.collection("cards").doc();
      const cardUserRef = db
        .collection("users")
        .doc(userId)
        .collection("decks")
        .doc(deckRef.id)
        .collection("cards")
        .doc(cardRef.id);

      const mainCard = {
        id: cardRef.id,
        cardData: {
          front: card.cardData.front,
          back: card.cardData.back,
        },
        tags: card.tags || [],
        firstLearn: {
          isNew: true,
        } as FirstLearn,
        createdAt: card.createdAt || new Date(),
        updatedAt: card.updatedAt || new Date(),
      } as Card;

      const validatedCardMain = CardSchema.parse(mainCard);

      currentBatch.set(cardRef, validatedCardMain);
      const validatedCard = CardSchema.parse({
        ...card,
        id: cardRef.id,
      });
      currentBatch.set(cardUserRef, validatedCard);
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= BATCH_LIMIT) {
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

    logger.info("Deck created from Anki import", {
      deckId: deckRef.id,
      cardCount: cards.length,
      userId,
    });

    try {
      await bucket.file(storagePath).delete();
      logger.info("Temporary import file deleted", { storagePath });
    } catch (cleanupError) {
      logger.warn("Failed to cleanup temporary import file", {
        storagePath,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }

    // Walidacja i zwrócenie odpowiedzi
    const response = {
      deckId: deckRef.id,
      count: cards.length,
    };

    return serializeTimestamps(ImportAnkiDeckResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error importing Anki deck", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      `Failed to import Anki deck: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }
});

/**
 * Record a view for a deck (called when user starts learning)
 * Each user can only count as one view per deck
 */
export const recordDeckView = onCall(async (request) => {
  const validationResult = RecordDeckViewRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const viewerRef = db.doc(`decks/${deckId}/viewers/${userId}`);

    // Use transaction to atomically add viewer and increment count
    await db.runTransaction(async (transaction) => {
      const deckRef = db.doc(`decks/${deckId}`);
      const deckSnap = await transaction.get(deckRef);

      if (!deckSnap.exists) {
        throw new HttpsError("not-found", "Deck not found");
      }

      // Add viewer document
      transaction.set(viewerRef, {
        viewedAt: FieldValue.serverTimestamp(),
      });

      // Increment view count
      transaction.update(deckRef, {
        views: FieldValue.increment(1),
      });
    });

    logger.info("Deck view recorded", { deckId, userId });

    const response = { success: true, isNewView: true };
    return serializeTimestamps(RecordDeckViewResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error recording deck view", error);
    handleZodError(error, "recordDeckView");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to record deck view");
  }
});

/**
 * Toggle like on a deck
 * Creates notification for deck creator when liked
 */
export const toggleDeckLike = onCall(async (request) => {
  const validationResult = ToggleDeckLikeRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const likedDeckRef = db.doc(`users/${userId}/likedDecks/${deckId}`);
    const likedDeckSnap = await likedDeckRef.get();
    const isCurrentlyLiked = likedDeckSnap.exists;

    let newLikeCount = 0;

    if (isCurrentlyLiked) {
      // Unlike: remove from likedDecks and decrement count
      await db.runTransaction(async (transaction) => {
        const deckRef = db.doc(`decks/${deckId}`);
        const deckSnap = await transaction.get(deckRef);

        if (!deckSnap.exists) {
          throw new HttpsError("not-found", "Deck not found");
        }

        const currentLikes = deckSnap.data()?.likes || 0;
        newLikeCount = Math.max(0, currentLikes - 1);

        transaction.delete(likedDeckRef);
        transaction.update(deckRef, {
          likes: FieldValue.increment(-1),
        });
      });

      logger.info("Deck unliked", { deckId, userId });

      const response = { success: true, liked: false, newLikeCount };
      return serializeTimestamps(ToggleDeckLikeResponseSchema.parse(response));
    } else {
      // Like: add to likedDecks and increment count
      let deckCreatorId: string | null = null;
      let deckTitle: string | null = null;

      await db.runTransaction(async (transaction) => {
        const deckRef = db.doc(`decks/${deckId}`);
        const deckSnap = await transaction.get(deckRef);

        if (!deckSnap.exists) {
          throw new HttpsError("not-found", "Deck not found");
        }

        const deckData = deckSnap.data();
        const currentLikes = deckData?.likes || 0;
        newLikeCount = currentLikes + 1;
        deckCreatorId = deckData?.createdBy || null;
        deckTitle = deckData?.title || null;

        transaction.set(likedDeckRef, {
          likedAt: FieldValue.serverTimestamp(),
          deckId: deckId,
        });

        transaction.update(deckRef, {
          likes: FieldValue.increment(1),
        });
      });

      logger.info("Deck liked", { deckId, userId });

      // Create notification for deck creator (if not liking own deck and not already notified)
      if (deckCreatorId && deckCreatorId !== userId && deckTitle) {
        try {
          // Check if this user has already triggered a notification for this deck
          const notifiedLikerRef = db.doc(
            `decks/${deckId}/notifiedLikers/${userId}`
          );
          const notifiedLikerSnap = await notifiedLikerRef.get();

          if (!notifiedLikerSnap.exists) {
            // First time liking - send notification and mark as notified
            const likerDoc = await db.doc(`users/${userId}`).get();
            const likerData = likerDoc.data();
            const likerUsername = likerData?.username || "Someone";

            const notificationRef = db.collection(
              `users/${deckCreatorId}/notifications`
            );
            const notification = {
              title: "New like!",
              body: `${likerUsername} liked your deck "${deckTitle}"`,
              type: "success",
              linkTo: `/deck/${deckId}`,
              read: false,
              createdAt: new Date(),
            };
            const validatedNotification = NotificationSchema.omit({ id: true }).parse(notification);
            await notificationRef.add(validatedNotification);

            // Mark this user as having been notified for this deck
            await notifiedLikerRef.set({
              notifiedAt: FieldValue.serverTimestamp(),
            });

            logger.info("Like notification created", {
              deckId,
              deckCreatorId,
              likerId: userId,
            });
          } else {
            logger.info("Skipping notification - user already notified before", {
              deckId,
              likerId: userId,
            });
          }
        } catch (notifError) {
          // Don't fail the like operation if notification fails
          logger.error("Failed to create like notification", notifError);
        }
      }

      const response = { success: true, liked: true, newLikeCount };
      return serializeTimestamps(ToggleDeckLikeResponseSchema.parse(response));
    }
  } catch (error) {
    logger.error("Error toggling deck like", error);
    handleZodError(error, "toggleDeckLike");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to toggle deck like");
  }
});

/**
 * Check if user has liked a deck
 */
export const checkIfLiked = onCall(async (request) => {
  const validationResult = CheckIfLikedRequestSchema.safeParse(
    request.data || {}
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const likedDeckRef = db.doc(`users/${userId}/likedDecks/${deckId}`);
    const likedDeckSnap = await likedDeckRef.get();

    const response = { isLiked: likedDeckSnap.exists };
    return serializeTimestamps(CheckIfLikedResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error checking if deck is liked", error);
    handleZodError(error, "checkIfLiked");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to check if deck is liked");
  }
});

/**
 * Add a single card to a deck (Quick Add feature)
 * Works for both source decks (owned by user) and learning decks (user's copies)
 */
export const addCardToDeck = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  // Validate request data
  const validationResult = AddCardToDeckRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, cardData, source } = validationResult.data;

  try {
    // Check if user owns this deck (source deck) or has a learning copy
    const sourceDeckRef = db.doc(`decks/${deckId}`);
    const learningDeckRef = db.doc(`users/${userId}/decks/${deckId}`);

    const [sourceDeckSnap, learningDeckSnap] = await Promise.all([
      sourceDeckRef.get(),
      learningDeckRef.get(),
    ]);

    let targetDeckRef: FirebaseFirestore.DocumentReference;
    let isSourceDeck = false;

    if (sourceDeckSnap.exists) {
      const sourceDeck = sourceDeckSnap.data() as Deck;
      const isOwner = sourceDeck.createdBy === userId;
      const isEditorUser = (sourceDeck.editors || []).includes(userId);
      if (isOwner || isEditorUser || await isAdmin(userId)) {
        // User owns, edits, or is admin - add to source
        targetDeckRef = sourceDeckRef;
        isSourceDeck = true;
      } else if (learningDeckSnap.exists) {
        // User has a learning copy - add to learning copy
        targetDeckRef = learningDeckRef;
      } else {
        throw new HttpsError(
          "permission-denied",
          "You don't have permission to add cards to this deck"
        );
      }
    } else if (learningDeckSnap.exists) {
      // Learning deck only (no source deck exists)
      targetDeckRef = learningDeckRef;
    } else {
      throw new HttpsError("not-found", "Deck not found");
    }

    // Create the card
    const cardRef = targetDeckRef.collection("cards").doc();
    const newCard = {
      id: cardRef.id,
      cardData: {
        front: cardData.front,
        back: cardData.back || "",
      },
      tags: [],
      createdAt: new Date(),
      firstLearn: {
        isNew: true,
      } as FirstLearn,
    } as Card;

    const validatedCard = CardSchema.parse(newCard);

    // Update deck cardsNum and add card in a batch
    const batch = db.batch();
    batch.set(cardRef, validatedCard);
    batch.update(targetDeckRef, {
      cardsNum: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.info("Card added to deck via Quick Add", {
      deckId,
      cardId: cardRef.id,
      userId,
      source: source || "manual",
      isSourceDeck,
    });

    const response = { success: true, cardId: cardRef.id };
    return serializeTimestamps(AddCardToDeckResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error adding card to deck", error);
    handleZodError(error, "addCardToDeck");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to add card to deck");
  }
});

/**
 * Search users by username prefix (for editor management)
 */
export const searchUsers = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const validationResult = SearchUsersRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { query } = validationResult.data;

  try {
    const endStr = query + "\uf8ff";

    const usersSnap = await db
      .collection("users")
      .where("username", ">=", query)
      .where("username", "<=", endStr)
      .limit(10)
      .get();

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username || doc.id,
    }));

    const response = { users };
    return SearchUsersResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error searching users", error);
    handleZodError(error, "searchUsers");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to search users");
  }
});

/**
 * Add an editor to a deck (owner-only)
 */
export const addDeckEditor = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const validationResult = AddDeckEditorRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, userId: editorUserId } = validationResult.data;
  const callerId = auth.uid;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const deckData = deckSnap.data();
    if (!deckData) {
      throw new HttpsError("not-found", "Deck not found");
    }

    // Only the deck owner can manage editors
    if (deckData.createdBy !== callerId) {
      throw new HttpsError(
        "permission-denied",
        "Only the deck owner can manage editors"
      );
    }

    // Verify the editor user exists
    const editorSnap = await db.doc(`users/${editorUserId}`).get();
    if (!editorSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    // Add editor to the array (avoid duplicates)
    await deckRef.update({
      editors: FieldValue.arrayUnion(editorUserId),
    });

    logger.info("Editor added to deck", { deckId, editorUserId, callerId });

    const response = { success: true };
    return AddDeckEditorResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error adding deck editor", error);
    handleZodError(error, "addDeckEditor");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to add deck editor");
  }
});

/**
 * Remove an editor from a deck (owner-only)
 */
export const removeDeckEditor = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const validationResult = RemoveDeckEditorRequestSchema.safeParse(
    request.data
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId, userId: editorUserId } = validationResult.data;
  const callerId = auth.uid;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const deckData = deckSnap.data();
    if (!deckData) {
      throw new HttpsError("not-found", "Deck not found");
    }

    if (deckData.createdBy !== callerId) {
      throw new HttpsError(
        "permission-denied",
        "Only the deck owner can manage editors"
      );
    }

    await deckRef.update({
      editors: FieldValue.arrayRemove(editorUserId),
    });

    logger.info("Editor removed from deck", {
      deckId,
      editorUserId,
      callerId,
    });

    const response = { success: true };
    return RemoveDeckEditorResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error removing deck editor", error);
    handleZodError(error, "removeDeckEditor");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to remove deck editor");
  }
});

/**
 * Get editors for a deck
 */
export const getDeckEditors = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const validationResult = GetDeckEditorsRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { deckId } = validationResult.data;

  try {
    const deckRef = db.collection("decks").doc(deckId);
    const deckSnap = await deckRef.get();

    if (!deckSnap.exists) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const deckData = deckSnap.data();
    if (!deckData) {
      throw new HttpsError("not-found", "Deck not found");
    }

    const editorIds: string[] = deckData.editors || [];

    // Fetch usernames for each editor
    const editors = await Promise.all(
      editorIds.map(async (editorId) => {
        const userSnap = await db.doc(`users/${editorId}`).get();
        return {
          id: editorId,
          username: userSnap.exists
            ? userSnap.data()?.username || editorId
            : editorId,
        };
      })
    );

    const response = { editors };
    return GetDeckEditorsResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error getting deck editors", error);
    handleZodError(error, "getDeckEditors");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get deck editors");
  }
});

// Suppress unused variable warning for getUserData - it may be used by future functions
void (getUserData as unknown);
