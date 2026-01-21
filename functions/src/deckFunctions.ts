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
} from "./types/common";
import { serializeTimestamps } from "./utils/serialization";
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
} from "memvocado-types/schemas/api/deck";
import { convertAnkiApkg } from "./ankiConverter";
import {
  DailyStats,
  DailyStatsSchema,
  DeckLearningDataUpdateSchema,
  NotificationSchema,
  User,
  UserDailyStats,
} from "memvocado-types";

const db = getFirestore();

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

    const response = {
      deck: validatedDeckData,
      username: userData.username,
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
      const userDeck = await copyUserDeck(userId, deckId);
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
  const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const deckSnap = await deckRef.get();
  if (!deckSnap.exists) {
    throw new HttpsError("not-found", "Deck not found");
  }
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

  const validatedRaw: Card[] = [
    ...cardsSnapFirst.docs,
    ...cardsSnapDue.docs,
  ].map((doc) => {
    return CardSchema.parse({
      id: doc.id,
      ...doc.data(),
    });
  });

  const dueFirst: Card[] = validatedRaw.filter(
    (c) => c.firstLearn?.isFirst && !c.firstLearn?.isNew
  );
  const dueFSRS: Card[] = validatedRaw.filter(
    (c) => c.cardAlgo?.due && c.cardAlgo.due.getTime() <= now
  );

  const validatedCards: Card[] = [...dueFirst, ...dueFSRS];

  return validatedCards;
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
 * Pomocniczo: formatuje datę na łańcuch w formacie YYYY-MM-DD w zadanej strefie czasowej.
 * @param {Date} date Data wejściowa
 * @param {string} timeZone Strefa czasowa IANA
 * @return {string} Data w formacie YYYY-MM-DD
 */
function formatYmdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<Card[]>} New cards
 */
async function getUserNewDeckCardsLocal(
  userId: string,
  deckId: string
): Promise<Card[]> {
  const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const userDeckSnap = await userDeckRef.get();
  if (!userDeckSnap.exists) {
    throw new HttpsError("not-found", "Deck not found");
  }

  // Get deck settings to check shuffleNewCards
  const userDeckData = userDeckSnap.data() as DeckLearningData;
  const shuffleNewCards =
    (userDeckData.settings as DeckSettings)?.shuffleNewCards ?? false;

  // Pobierz ustawienia użytkownika dla timeZone
  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  const userData = userSnap.exists
    ? UserSchema.parse({
        id: userSnap.id,
        ...userSnap.data(),
      })
    : null;

  // Sprawdź dailyStats i użyj newCardsRemaining jeśli istnieje i jest z dzisiaj
  const effectiveLimit = userDeckData.settings.newCardsNumPerDay
    ? userDeckData.settings.newCardsNumPerDay
    : userData?.settings?.dailyNew
    ? userData?.settings?.dailyNew
    : 50;

  // Get new cards directly from user's collection (all cards are already copied)
  const userCardsRef = userDeckRef.collection("cards");
  let userCardsSnap;

  if (shuffleNewCards) {
    // Shuffle włączony: obecne zachowanie - limit bez sortowania
    userCardsSnap = await userCardsRef
      .where("firstLearn.isNew", "==", true)
      .limit(effectiveLimit)
      .get();
  } else {
    // Shuffle wyłączony: sortuj po createdAt ASC (najstarsze najpierw)
    userCardsSnap = await userCardsRef
      .where("firstLearn.isNew", "==", true)
      .orderBy("createdAt", "asc")
      .limit(effectiveLimit)
      .get();
  }

  const cards = userCardsSnap.docs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
    } as Card;
  });

  const validatedCards: Card[] = cards.map((c) => CardSchema.parse(c));

  return validatedCards;
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
    const dailyStats = await getDailyStatsToday(userId, deckId);
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
  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return null;
  }
  return UserSchema.parse(userSnap.data());
}

/**
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<DailyStats | null>} Daily stats
 */
async function getDailyStats(
  userId: string,
  deckId: string
): Promise<DailyStats | null> {
  const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const userDeckSnap = await userDeckRef.get();
  if (!userDeckSnap.exists) {
    throw new HttpsError("not-found", "Deck not found");
  }
  const dailyStats = userDeckSnap.data()?.dailyStats;
  if (!dailyStats) {
    return null;
  }
  return DailyStatsSchema.parse(dailyStats);
}

/**
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<DailyStats | null>} Daily stats
 */
async function getDailyStatsToday(
  userId: string,
  deckId: string
): Promise<DailyStats | null> {
  const dailyStats = await getDailyStats(userId, deckId);
  const userData = await getUserData(userId);
  const timeZone = userData?.settings?.timeZone || "UTC";

  if (dailyStats && dailyStats.lastUpdatedStats) {
    const nowDate = new Date();
    const todayYmd = formatYmdInTimeZone(nowDate, timeZone);
    const statsYmd = formatYmdInTimeZone(dailyStats.lastUpdatedStats, timeZone);
    if (statsYmd != todayYmd) {
      return null;
    }
  }
  return dailyStats;
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

/**
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<DeckLearningData | null>} Deck
 */
async function getUserDeckLocal(
  userId: string,
  deckId: string
): Promise<DeckLearningData | null> {
  const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);
  const userDeckSnap = await userDeckRef.get();
  if (!userDeckSnap.exists) {
    return null;
  }
  return DeckLearningDataSchema.parse(userDeckSnap.data());
}

export const startLearningSession = onCall(async (request) => {
  const validationResult = StartLearningSessionRequestSchema.safeParse(
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
    let deck = await getUserDeckLocal(userId, deckId);
    if (!deck) {
      const newDeck = await copyUserDeck(userId, deckId);
      deck = newDeck;
    }
    const [dueCards, newCards] = await Promise.all([
      getUserDueDeckCardsLocal(userId, deckId),
      getUserNewDeckCardsLocal(userId, deckId),
    ]);

    let currentStats;
    const userDeckRef = db.doc(`users/${userId}/decks/${deckId}`);

    const dailyStatsToday = await getDailyStatsToday(userId, deckId);

    if (dailyStatsToday) {
      currentStats = dailyStatsToday;
    } else {
      currentStats = {
        newCardsRemaining: newCards.length,
        dueCardsRemaining: dueCards.length,
        inProgressDueCards: 0,
        inProgressNewCards: 0,
        completedNewToday: 0,
        completedDueToday: 0,
        lastUpdatedStats: new Date(),
      };
    }

    const userData = await getUserData(userId);

    // Strip new cards if limit is exceeded

    const settingsNewLimit = deck.settings.newCardsNumPerDay
      ? deck.settings.newCardsNumPerDay
      : userData?.settings?.dailyNew
      ? userData?.settings?.dailyNew
      : 50;

    const newCardsTotal =
      (currentStats?.inProgressNewCards ?? 0) +
      (currentStats?.completedNewToday ?? 0) +
      newCards.length;

    const newCardsStripped =
      newCardsTotal > settingsNewLimit
        ? newCards.slice(
            0,
            newCards.length - (newCardsTotal - settingsNewLimit)
          )
        : newCards;

    currentStats.newCardsRemaining = newCardsStripped.length;
    userDeckRef.update({
      dailyStats: currentStats,
    });

    const response = {
      cards: [...dueCards, ...newCardsStripped],
      dailyStats: currentStats,
      deck: deck,
    };
    const validatedResponse =
      StartLearningSessionResponseSchema.parse(response);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error starting learning session", error);
    handleZodError(error, "startLearningSession");
    if (error instanceof HttpsError) {
      throw error;
    }
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
  const userData = await getUserData(userId);
  if (!userData || !userData.dailyStats) {
    return null;
  }
  const dailyStats = userData.dailyStats;
  const timeZone = userData.settings.timeZone || "UTC";
  const nowDate = new Date();
  if (dailyStats && dailyStats.lastUpdatedStats) {
    const todayYmd = formatYmdInTimeZone(nowDate, timeZone);
    const statsYmd = formatYmdInTimeZone(dailyStats.lastUpdatedStats, timeZone);
    if (statsYmd != todayYmd) {
      return null;
    }
  }

  return userData.dailyStats;
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
 * Update user stats when card is reviewed
 */

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

    // Check if category, icon, or tags changed
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

    // If nothing changed, skip
    if (!categoryChanged && !iconChanged && !tagsChanged) {
      logger.debug("No metadata changes detected, skipping sync", { deckId });
      return;
    }

    try {
      // Prepare update data with only changed fields
      const updateData: {
        category?: string | null;
        icon?: string;
        tags?: string[];
        updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      } = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (categoryChanged) {
        updateData.category = afterCategory;
      }
      if (iconChanged) {
        updateData.icon = afterIcon;
      }
      if (tagsChanged) {
        updateData.tags = validatedAfterData.tags;
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

    // Check if user is the creator of the deck
    if (validatedDeckData.createdBy !== userId) {
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
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @return {Promise<DeckLearningData>} Deck Learning Data
 */
async function copyUserDeck(
  userId: string,
  deckId: string
): Promise<DeckLearningData> {
  // Verify source deck exists
  const srcDeckRef = db.collection("decks").doc(deckId);
  const srcDeckSnap = await srcDeckRef.get();
  if (!srcDeckSnap.exists) {
    throw new HttpsError("not-found", "Deck not found");
  }

  const srcDeckRaw = srcDeckSnap.data();
  if (!srcDeckRaw) {
    throw new HttpsError("not-found", "Deck data is empty");
  }

  // Validate deck data structure
  const srcDeck = DeckSchema.parse({
    id: deckId,
    ...srcDeckRaw,
  });

  // Check if deck is deleted
  if (srcDeck.is_deleted === true) {
    throw new HttpsError("not-found", "Deck has been deleted");
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
      settings: { zenMode: false, shuffleNewCards: false } as DeckSettings,
      updatedAt: srcDeck.updatedAt,
      category: srcDeck.category,
      icon: srcDeck.icon,
      tags: srcDeck.tags,
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

        const card: Omit<Card, "id"> = {
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

        const validatedCard = CardSchema.parse({
          id: sourceCardDoc.id,
          ...card,
        });
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
  } else {
    // Deck already exists, get it
    const existingDeck = userDeckSnap.data() as DeckLearningData;
    userDeck = DeckLearningDataSchema.parse({ ...existingDeck, id: deckId });
  }

  logger.info("Deck copied to user space", { userId, deckId });
  if (!userDeck) {
    throw new HttpsError("internal", "Failed to create user deck");
  }

  return userDeck;
}

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
    const userDeck = await copyUserDeck(userId, deckId);
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

    // Check if user is the creator of the deck
    if (validatedDeckData.createdBy !== userId) {
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

    if (validatedSourceDeckData.updatedAt) {
      enqueue((batch) =>
        batch.update(userDeckRef, {
          updatedAt: validatedSourceDeckData.updatedAt,
        })
      );
    }

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
    }

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
    if (validatedDeckData.createdBy !== userId) {
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

    // Check if user is the owner
    if (validatedDeckData.createdBy !== userId) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to edit this deck"
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
      `Failed to import Anki deck: ${
        error instanceof Error ? error.message : String(error)
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
