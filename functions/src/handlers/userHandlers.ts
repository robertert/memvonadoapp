import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  UserSettingsSchema,
  UserProgressSchema,
  CardSchema,
  SuccessResponseSchema,
  GetUserDecksResponseSchema,
} from "../types/common";
import { z } from "zod";
import {
  UpdateUserStreakIfQualifiedRequestSchema,
  UpdateUserStreakIfQualifiedResponseSchema,
  UpdateUserStreakOnLoginRequestSchema,
  UpdateUserStreakOnLoginResponseSchema,
  GetUserDecksRequestSchema,
  UpdateCardProgressRequestSchema,
  GetUserProgressRequestSchema,
  GetUserProgressResponseSchema,
  GetUserSettingsRequestSchema,
  GetUserSettingsResponseSchema,
  GetUserProfileRequestSchema,
  GetUserProfileResponseSchema,
  GetUserActivityHeatmapRequestSchema,
  GetUserActivityHeatmapResponseSchema,
  GetUserAwardsRequestSchema,
  GetUserAwardsResponseSchema,
  SubmitPointsRequestSchema,
  SubmitPointsResponseSchema as ApiSubmitPointsResponseSchema,
  UpdateUserSettingsRequestSchema,
  ServerNowSchema,
  GetCurrentSeasonResponseSchema,
  WeeklyRollOverResponseSchema as ApiWeeklyRollOverResponseSchema,
  UndoCardRequestSchema,
  UndoCardResponseSchema,
  UpdateCardProgressAllInOneRequestSchema,
  UpdateCardProgressAllInOneResponseSchema,
} from "memvocado-types";
import {
  GetPublicUserProfileRequestSchema,
  GetPublicUserProfileResponseSchema,
  ToggleFollowRequestSchema,
  ToggleFollowResponseSchema,
  IsCurrentUserAdminResponseSchema,
  GetUserByUsernameRequestSchema,
  GetUserByUsernameResponseSchema,
} from "memvocado-types/schemas/api/user";
import { serializeTimestamps } from "../utils/serialization";
import {
  updateAvocadoGrowthInternal,
  resetAvocadoGrowthInternal,
} from "../avocadoFunctions";
import { FirestoreCardRepository } from "../repositories/firestore/FirestoreCardRepository";
import { FirestoreUserRepository } from "../repositories/firestore/FirestoreUserRepository";
import { FirestoreStatsRepository } from "../repositories/firestore/FirestoreStatsRepository";
import { FirestoreSeasonRepository } from "../repositories/firestore/FirestoreSeasonRepository";
import { CardProgressService } from "../services/CardProgressService";
import { StreakService } from "../services/StreakService";
import { UserService } from "../services/UserService";
import { SeasonService } from "../services/SeasonService";

const cardRepo = new FirestoreCardRepository();
const userRepo = new FirestoreUserRepository();
const statsRepo = new FirestoreStatsRepository();
const seasonRepo = new FirestoreSeasonRepository();

const progressService = new CardProgressService(cardRepo, userRepo, statsRepo);
const streakService = new StreakService(userRepo);
const userService = new UserService(userRepo);
const seasonService = new SeasonService(seasonRepo, userRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Aktualizuje streak użytkownika „na żądanie" przy starcie aplikacji.
 */
export const updateUserStreakOnLogin = onCall(async (request) => {
  const parsedRequest = UpdateUserStreakOnLoginRequestSchema.safeParse(
    request.data
  );
  if (!parsedRequest.success) {
    logger.error("updateUserStreakOnLogin: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;

  try {
    const user = await userRepo.getUser(userId);
    if (!user) throw new HttpsError("not-found", "User not found");

    try {
      await userService.archiveDailyStatsIfNeeded(userId);
    } catch (archiveErr) {
      logger.warn("updateUserStreakOnLogin: daily stats archive failed", archiveErr);
    }

    const streakResult = await streakService.updateStreakOnLogin(userId);

    if (streakResult.status === "streak_safe") {
      return serializeTimestamps(UpdateUserStreakOnLoginResponseSchema.parse({
        updated: false,
        currentStreak: streakResult.currentStreak,
        status: "streak_safe",
      }));
    }

    let avocadoWasReset = false;
    let avocadoHadPendingHarvest = false;
    try {
      const avocadoResult = await resetAvocadoGrowthInternal({ userId });
      avocadoWasReset = avocadoResult.wasReset;
      avocadoHadPendingHarvest = avocadoResult.hadPendingHarvest;
    } catch (avocadoErr) {
      logger.warn("updateUserStreakOnLogin: avocado reset check failed", avocadoErr);
    }

    const validatedResponse = UpdateUserStreakOnLoginResponseSchema.parse({
      updated: true,
      currentStreak: 0,
      previousStreak: streakResult.previousStreak,
      longestStreak: streakResult.longestStreak,
      lastStreakDate: streakResult.lastStreakDate,
      status: "streak_reset",
      avocadoWasReset,
      avocadoHadPendingHarvest,
    });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("updateUserStreakOnLogin failed", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update streak");
  }
});

/**
 * Aktualizuje streak natychmiast po spełnieniu progu dziennego.
 */
export const updateUserStreakIfQualified = onCall(async (request) => {
  const parsedRequest = UpdateUserStreakIfQualifiedRequestSchema.safeParse(
    request.data
  );
  if (!parsedRequest.success) {
    logger.error("updateUserStreakIfQualified: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;
  try {
    const threshold = await userService.getStreakThreshold();
    const streakResult = await streakService.updateStreakIfQualified(userId, threshold);

    let avocadoResult = null;
    if (streakResult.updated) {
      try {
        avocadoResult = await updateAvocadoGrowthInternal({
          userId,
          timeZone: streakResult.timeZone,
        });
      } catch (avocadoErr) {
        logger.warn("updateUserStreakIfQualified: avocado growth update failed", avocadoErr);
      }
    }

    const validatedResponse = UpdateUserStreakIfQualifiedResponseSchema.parse({
      ...streakResult,
      avocadoGrew: avocadoResult?.updated,
      avocadoPreviousPhase: avocadoResult?.previousPhase,
      avocadoCurrentPhase: avocadoResult?.currentPhase,
      avocadoConsecutiveDays: avocadoResult?.consecutiveDays,
      avocadoCanHarvest: avocadoResult?.canHarvest,
    });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("updateUserStreakIfQualified failed", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update streak by threshold");
  }
});

/**
 * Get user decks with cards
 */
export const getUserDecks = onCall(async (request) => {
  const parsedRequest = GetUserDecksRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("getUserDecks: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const decks = await userRepo.listUserDecks(userId);
    const validatedResponse = GetUserDecksResponseSchema.parse({ decks });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user decks", error);
    handleZodError(error, "getUserDecks");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user decks");
  }
});

export const undoCard = onCall(async (request) => {
  const parsedRequest = UndoCardRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("undoCard: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;

  try {
    const { deckId, card, dailyStats } = parsedRequest.data;

    const validatedCard = CardSchema.parse(card);
    await progressService.undoCard({
      userId,
      deckId,
      card: validatedCard,
      previousCard: validatedCard,
      dailyStats: dailyStats ?? undefined,
    });

    const successResponse = UndoCardResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error undoing card", error);
    handleZodError(error, "undoCard");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to undo card");
  }
});

export const updateCardProgressAllInOne = onCall(async (request) => {
  const parsedRequest = UpdateCardProgressAllInOneRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("updateCardProgressAllInOne: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;

  const { isIncrement } = parsedRequest.data;

  try {
    await userService.updateAllInOneStats(userId, isIncrement);
    const successResponse = UpdateCardProgressAllInOneResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error updating user stats", error);
    handleZodError(error, "updateCardProgressAllInOne");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update card progress all in one");
  }
});

/**
 * Update card progress after review
 */
export const updateCardProgress = onCall(async (request) => {
  const parsedRequest = UpdateCardProgressRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("updateCardProgress: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, deckId, card, scheduledTime, dailyStats, direction } =
    parsedRequest.data;
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  if (auth.uid !== userId) {
    throw new HttpsError(
      "permission-denied",
      "Cannot update progress for another user"
    );
  }
  if (scheduledTime <= 0 || !Number.isFinite(scheduledTime)) {
    throw new HttpsError(
      "invalid-argument",
      "scheduledTime must be a positive number of milliseconds"
    );
  }

  try {
    await progressService.updateProgress({
      userId,
      deckId,
      card: CardSchema.parse(card),
      scheduledTime,
      direction: direction as "forward" | "reverse" | undefined,
      dailyStats: dailyStats ?? undefined,
    });

    const successResponse = SuccessResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error updating card progress", error);
    handleZodError(error, "updateCardProgress");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update card progress");
  }
});

/**
 * Get user progress and statistics
 */
export const getUserProgress = onCall(async (request) => {
  const parsedRequest = GetUserProgressRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserProgress: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const progress = await userService.getUserProgress(userId);
    const userProgress = UserProgressSchema.parse(progress);
    const validatedResponse = GetUserProgressResponseSchema.parse({ userProgress });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user progress", error);
    handleZodError(error, "getUserProgress");
    if (error instanceof HttpsError) {
      throw error;
    }
    if ((error as { code?: string }).code === "not-found") {
      throw new HttpsError("not-found", "User not found");
    }
    throw new HttpsError("internal", "Failed to get user progress");
  }
});

/**
 * Get user settings
 */
export const getUserSettings = onCall(async (request) => {
  const parsedRequest = GetUserSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserSettings: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const settings = await userService.getUserSettings(userId);
    const validatedSettings = UserSettingsSchema.parse(settings);
    const validatedResponse = GetUserSettingsResponseSchema.parse({ settings: validatedSettings });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user settings", error);
    handleZodError(error, "getUserSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user settings");
  }
});

/**
 * Return server authoritative time
 */
export const serverNow = onCall(async () => {
  const now = new Date();
  const rawResponse = {
    nowMs: now.getTime(),
    iso: now.toISOString(),
  };

  try {
    const validatedResponse = ServerNowSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    handleZodError(error, "serverNow");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get server time");
  }
});

/**
 * Get or initialize current season (weekly windows, server-defined)
 */
export const getCurrentSeason = onCall(async () => {
  try {
    const season = await seasonService.getOrInitializeSeason();
    const validatedResponse = GetCurrentSeasonResponseSchema.parse(season);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting current season", error);
    handleZodError(error, "getCurrentSeason");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get current season");
  }
});

/**
 * Submit points for current season (authoritative, server-timestamped)
 */
export const submitPoints = onCall(async (request) => {
  const parsedRequest = SubmitPointsRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("submitPoints: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }
  try {
    const { userId, delta } = parsedRequest.data;
    await seasonService.submitPoints(userId, delta);
    const validatedResponse = ApiSubmitPointsResponseSchema.parse({ success: true });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    handleZodError(error, "submitPoints");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to submit points");
  }
});

/**
 * Close current season and publish simple leaderboard snapshot
 */
export const weeklyRollOver = onCall(async () => {
  try {
    const { nextSeasonId } = await seasonService.rollOverSeason();
    const validatedResponse = ApiWeeklyRollOverResponseSchema.parse({
      success: true,
      nextSeasonId,
    });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    if ((error as { code?: string }).code === "failed-precondition") {
      throw new HttpsError("failed-precondition", "No current season");
    }
    handleZodError(error, "weeklyRollOver");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to roll over season");
  }
});

/**
 * Update user settings
 */
export const updateUserSettings = onCall(async (request) => {
  const parsedRequest = UpdateUserSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("updateUserSettings: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, settings } = parsedRequest.data;

  try {
    const validatedSettings = UserSettingsSchema.parse(settings);
    await userService.updateUserSettings(userId, validatedSettings);
    const successResponse = SuccessResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error updating user settings", error);
    handleZodError(error, "updateUserSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update user settings");
  }
});

/**
 * Get user profile with full information
 */
export const getUserProfile = onCall(async (request) => {
  const parsedRequest = GetUserProfileRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserProfile: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const user = await userRepo.getUser(userId);
    if (!user) {
      logger.error("User not found", { userId });
      throw new HttpsError("not-found", "User not found");
    }
    const response = GetUserProfileResponseSchema.parse(user);
    return serializeTimestamps(response);
  } catch (error) {
    logger.error("Error getting user profile", error);
    handleZodError(error, "getUserProfile");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user profile");
  }
});

/**
 * Get user activity heatmap data
 */
export const getUserActivityHeatmap = onCall(async (request) => {
  const parsedRequest = GetUserActivityHeatmapRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserActivityHeatmap: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, weeks = 16 } = parsedRequest.data;

  try {
    const heatmapData = await userService.getActivityHeatmap(userId, weeks);
    const validatedResponse = GetUserActivityHeatmapResponseSchema.parse({ heatmapData });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user activity heatmap", error);
    handleZodError(error, "getUserActivityHeatmap");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user activity heatmap");
  }
});

/**
 * Get user awards
 */
export const getUserAwards = onCall(async (request) => {
  const parsedRequest = GetUserAwardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserAwards: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const awards = await userService.getUserAwards(userId);
    const validatedResponse = GetUserAwardsResponseSchema.parse({ awards });
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user awards", error);
    handleZodError(error, "getUserAwards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user awards");
  }
});

/**
 * Get public user profile (for viewing other users)
 */
export const getPublicUserProfile = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const parsedRequest = GetPublicUserProfileRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { targetUserId } = parsedRequest.data;
  const callerId = auth.uid;

  try {
    const result = await userService.getPublicUserProfile(callerId, targetUserId);
    const validatedResponse = GetPublicUserProfileResponseSchema.parse(result);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting public user profile", error);
    handleZodError(error, "getPublicUserProfile");
    if ((error as { code?: string }).code === "not-found") {
      throw new HttpsError("not-found", "User not found");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get public user profile");
  }
});

/**
 * Toggle follow/unfollow a user
 */
export const toggleFollow = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const parsedRequest = ToggleFollowRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { targetUserId } = parsedRequest.data;
  const callerId = auth.uid;

  if (callerId === targetUserId) {
    throw new HttpsError("invalid-argument", "Cannot follow yourself");
  }

  try {
    const result = await userService.toggleFollow(callerId, targetUserId);
    logger.info("Toggle follow", { callerId, targetUserId, isFollowing: result.isFollowing });
    const response = { success: true, isFollowing: result.isFollowing };
    return ToggleFollowResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error toggling follow", error);
    handleZodError(error, "toggleFollow");
    if ((error as { code?: string }).code === "not-found") {
      throw new HttpsError("not-found", "User not found");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to toggle follow");
  }
});

/**
 * Check if current user is an admin
 */
export const isCurrentUserAdmin = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const isAdmin = await userService.isAdmin(userId);
    const response = { isAdmin };
    return IsCurrentUserAdminResponseSchema.parse(response);
  } catch (error) {
    logger.error("Error checking admin status", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to check admin status");
  }
});

/**
 * Get user by username (for deep link resolution — no auth required)
 */
export const getUserByUsername = onCall(async (request) => {
  const parsedRequest = GetUserByUsernameRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { username } = parsedRequest.data;

  try {
    const userId = await userService.findByUsername(username);
    if (!userId) {
      return GetUserByUsernameResponseSchema.parse({ exists: false });
    }
    return GetUserByUsernameResponseSchema.parse({ exists: true, userId });
  } catch (error) {
    logger.error("Error getting user by username", error);
    handleZodError(error, "getUserByUsername");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user by username");
  }
});
