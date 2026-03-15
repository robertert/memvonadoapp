import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { getFirestore, WriteBatch } from "firebase-admin/firestore";
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
const deckService = new DeckService(deckRepo, cardRepo, userRepo);
const statsService = new StatsService(statsRepo, userRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/** Map service-layer errors to Firebase HttpsErrors */
/**
 * @param {unknown} error - The error to map
 * @param {string} ctx - The context of the error
 */
function mapServiceError(error: unknown, ctx: string): never {
  if (error instanceof HttpsError) throw error;
  if (error instanceof Error) {
    if (error.message.startsWith("permission-denied:")) {
      throw new HttpsError("permission-denied", error.message.slice(18).trim());
    }
    if (error.message === "not-found") {
      throw new HttpsError("not-found", "Not found");
    }
  }
  logger.error(`Error in ${ctx}`, error);
  throw new HttpsError("internal", `Failed: ${ctx}`);
}

/**
 * Bulk create deck with cards
 */
export const createDeckWithCards = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = CreateDeckWithCardsRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckData, cards } = parsed.data;
  try {
    const deckId = await deckService.createDeckWithCards(
      request.auth.uid,
      deckData,
      cards as CardCore[]
    );
    logger.info("Deck created successfully", { deckId, cardCount: cards.length });
    return serializeTimestamps(
      CreateDeckWithCardsResponseSchema.parse({ deckId })
    );
  } catch (error) {
    mapServiceError(error, "createDeckWithCards");
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
    const deck = await deckRepo.getSourceDeck(deckId);
    if (!deck || deck.is_deleted) {
      throw new HttpsError("not-found", "Deck not found");
    }
    const user = await userRepo.getUser(deck.createdBy);
    if (!user) {
      throw new HttpsError("not-found", "User not found");
    }
    const callerId = request.auth?.uid;
    const isEditor = callerId ? (deck.editors || []).includes(callerId) : false;
    const response = { deck, username: user.username, isEditor };
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
    const deck = await deckRepo.getSourceDeck(deckId);
    if (!deck) throw new HttpsError("not-found", "Deck not found");
    const result = await cardRepo.getSourceDeckCardsPaginated(deckId, limit, startAfter ?? undefined);
    const response = { cards: result.cards as Card[], hasMore: result.hasMore, lastDocId: result.lastDocId };
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
    const userDeck = await deckRepo.getUserDeck(userId, deckId);
    if (!userDeck) {
      const newDeck = await deckService.copyDeck(userId, deckId);
      return serializeTimestamps(GetUserDeckDetailsResponseSchema.parse({ deck: newDeck, createdDeck: true }));
    }
    return serializeTimestamps(GetUserDeckDetailsResponseSchema.parse({ deck: userDeck as DeckLearningData, createdDeck: false }));
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
    const userDeck = await deckRepo.getUserDeck(userId, deckId);
    if (!userDeck) throw new HttpsError("not-found", "Deck not found");
    const result = await cardRepo.getUserDeckCardsPaginated(userId, deckId, limit, startAfter ?? undefined);
    const response = { cards: result.cards as Card[], hasMore: result.hasMore, lastDocId: result.lastDocId };
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
      await statsService.aggregateUserStats(userId);
      logger.info("User stats aggregated successfully", { userId });
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
    const afterRaw = event.data?.after.data();

    if (!afterRaw) {
      logger.info("Deck deleted, skipping sync", { deckId });
      return;
    }

    let afterData: Deck;
    try {
      afterData = DeckSchema.parse({ id: deckId, ...afterRaw });
    } catch (error) {
      logger.error("Invalid deck data, skipping sync", { deckId, error });
      return;
    }

    const beforeRaw = event.data?.before.data();
    let beforeData: Partial<Deck> | null = null;
    if (beforeRaw) {
      try {
        beforeData = DeckSchema.parse({ id: deckId, ...beforeRaw });
      } catch {
        beforeData = beforeRaw as Partial<Deck>;
      }
    }

    try {
      await deckService.syncMetadata(deckId, beforeData, afterData);
    } catch (error) {
      logger.error("Error syncing deck metadata to user copies", { deckId, error });
    }
  }
);

/**
 * Reset deck progress - removes all card progress data
 */
export const resetDeck = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = ResetDeckRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId } = parsed.data;
  try {
    await deckService.resetDeck(request.auth.uid, deckId);
    logger.info("Deck progress reset successfully", { deckId, userId: request.auth.uid });
    return serializeTimestamps(SuccessResponseSchema.parse({ success: true }));
  } catch (error) {
    mapServiceError(error, "resetDeck");
  }
});

/**
 * Update deck settings
 */
export const updateDeckSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = UpdateDeckSettingsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, deck } = parsed.data;
  try {
    await deckService.updateDeckSettings(
      request.auth.uid,
      deckId,
      deck as Partial<Deck>
    );
    logger.info("Deck settings updated successfully", { deckId, userId: request.auth.uid });
    return serializeTimestamps(SuccessResponseSchema.parse({ success: true }));
  } catch (error) {
    mapServiceError(error, "updateDeckSettings");
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
    const currentDeck = await deckRepo.getUserDeck(userId, deckId);
    if (!currentDeck) throw new HttpsError("not-found", "Deck not found");
    const validatedSettings = DeckSettingsUpdateSchema.parse(settings);
    await deckRepo.updateUserDeck(userId, deckId, {
      settings: { ...currentDeck.settings, ...validatedSettings },
    });
    logger.info("User deck settings updated successfully", { deckId, userId });
    return serializeTimestamps(SuccessResponseSchema.parse({ success: true }));
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = DeleteDeckRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId } = parsed.data;
  try {
    const { notifiedUsers } = await deckService.deleteDeck(request.auth.uid, deckId);
    logger.info("Deck soft deleted successfully", { deckId, userId: request.auth.uid, notifiedUsers });
    return serializeTimestamps(
      DeleteDeckResponseSchema.parse({ success: true, notifiedUsers })
    );
  } catch (error) {
    mapServiceError(error, "deleteDeck");
  }
});

/**
 * Check for changes between source deck and user's local copy
 * Returns list of cards with differences
 */
export const checkCardChanges = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = CheckCardChangesRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId } = parsed.data;
  try {
    const changes = await deckService.checkCardChanges(request.auth.uid, deckId);
    return CheckCardChangesResponseSchema.parse({ changes });
  } catch (error) {
    mapServiceError(error, "checkCardChanges");
  }
});

/**
 * Synchronize user's local card copies with source deck
 * Options: syncAll (all changes) or syncSelected (specific cardIds)
 */
export const syncDeckCards = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = SyncDeckCardsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, syncAll = false, cardIds = [] } = parsed.data;
  if (!syncAll && (!Array.isArray(cardIds) || cardIds.length === 0)) {
    throw new HttpsError(
      "invalid-argument",
      "Either syncAll must be true or cardIds must be provided"
    );
  }
  try {
    const { syncedCount } = await deckService.syncCards(
      request.auth.uid,
      deckId,
      { syncAll, cardIds }
    );
    logger.info("Cards synchronized", { userId: request.auth.uid, deckId, syncedCount, syncAll });
    return SyncDeckCardsResponseSchema.parse({ success: true, syncedCount });
  } catch (error) {
    mapServiceError(error, "syncDeckCards");
  }
});

/**
 * Update card content (cardData and tags) - only for source deck authors/editors
 */
export const updateCardContent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = UpdateCardContentRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, cardId, cardData } = parsed.data;
  try {
    await deckService.updateCardContent(request.auth.uid, deckId, cardId, cardData);
    logger.info("Card content updated", { userId: request.auth.uid, deckId, cardId });
    return UpdateCardContentResponseSchema.parse({ success: true });
  } catch (error) {
    mapServiceError(error, "updateCardContent");
  }
});

/**
 * Update deck with cards - accepts only changes (no card fetching)
 * Optimized to avoid Firestore reads by accepting client-side diffing
 */
export const updateDeck = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = UpdateDeckRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, deckData, changes } = parsed.data;
  try {
    const result = await deckService.updateDeck(
      request.auth.uid,
      deckId,
      deckData,
      changes
    );
    logger.info("Deck updated successfully", {
      userId: request.auth.uid,
      deckId,
      ...result,
    });
    return UpdateDeckResponseSchema.parse({ success: true, ...result });
  } catch (error) {
    mapServiceError(error, "updateDeck");
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = RecordDeckViewRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId } = parsed.data;
  try {
    await deckService.recordView(request.auth.uid, deckId);
    logger.info("Deck view recorded", { deckId, userId: request.auth.uid });
    return serializeTimestamps(
      RecordDeckViewResponseSchema.parse({ success: true, isNewView: true })
    );
  } catch (error) {
    mapServiceError(error, "recordDeckView");
  }
});

/**
 * Toggle like on a deck
 * Creates notification for deck creator when liked
 */
export const toggleDeckLike = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = ToggleDeckLikeRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId } = parsed.data;
  try {
    const { liked, newLikeCount } = await deckService.toggleLike(
      request.auth.uid,
      deckId
    );
    logger.info(liked ? "Deck liked" : "Deck unliked", { deckId, userId: request.auth.uid });
    return serializeTimestamps(
      ToggleDeckLikeResponseSchema.parse({ success: true, liked, newLikeCount })
    );
  } catch (error) {
    mapServiceError(error, "toggleDeckLike");
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
    const isLiked = await deckRepo.isLikedByUser(userId, deckId);
    return serializeTimestamps(CheckIfLikedResponseSchema.parse({ isLiked }));
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = AddCardToDeckRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, cardData, source } = parsed.data;
  try {
    const cardId = await deckService.addCard(request.auth.uid, deckId, cardData);
    logger.info("Card added to deck via Quick Add", {
      deckId,
      cardId,
      userId: request.auth.uid,
      source: source || "manual",
    });
    return serializeTimestamps(
      AddCardToDeckResponseSchema.parse({ success: true, cardId })
    );
  } catch (error) {
    mapServiceError(error, "addCardToDeck");
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
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = AddDeckEditorRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, userId: editorUserId } = parsed.data;
  try {
    await deckService.addDeckEditor(request.auth.uid, deckId, editorUserId);
    logger.info("Editor added to deck", { deckId, editorUserId, callerId: request.auth.uid });
    return AddDeckEditorResponseSchema.parse({ success: true });
  } catch (error) {
    mapServiceError(error, "addDeckEditor");
  }
});

/**
 * Remove an editor from a deck (owner-only)
 */
export const removeDeckEditor = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const parsed = RemoveDeckEditorRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }
  const { deckId, userId: editorUserId } = parsed.data;
  try {
    await deckService.removeDeckEditor(request.auth.uid, deckId, editorUserId);
    logger.info("Editor removed from deck", { deckId, editorUserId, callerId: request.auth.uid });
    return RemoveDeckEditorResponseSchema.parse({ success: true });
  } catch (error) {
    mapServiceError(error, "removeDeckEditor");
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
    const deck = await deckRepo.getSourceDeck(deckId);
    if (!deck) throw new HttpsError("not-found", "Deck not found");
    const editorIds: string[] = deck.editors || [];
    const editors = await Promise.all(
      editorIds.map(async (editorId) => {
        const user = await userRepo.getUser(editorId);
        return { id: editorId, username: user?.username || editorId };
      })
    );
    return GetDeckEditorsResponseSchema.parse({ editors });
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
