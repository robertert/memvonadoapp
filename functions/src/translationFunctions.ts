import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import {
  TranslateTextRequestSchema,
  TranslateTextResponseSchema,
  GetTranslationLimitResponseSchema,
  DAILY_TRANSLATION_LIMIT,
} from "memvocado-types/schemas/api/translation";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

// Google Cloud Translation API
import { TranslationServiceClient } from "@google-cloud/translate";
const translationClient = new TranslationServiceClient();

// Get project ID from environment or default
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "memvocado";
const LOCATION = "global";

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 * @return {string} Today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get midnight UTC for tomorrow (reset time)
 * @return {string} Midnight UTC for tomorrow
 */
function getTomorrowMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Get user's translation usage for today
 * @param {string} userId - User ID
 * @return {Promise<number>} User's translation usage for today
 */
async function getUserTranslationUsage(userId: string): Promise<number> {
  const today = getTodayDateString();
  const usageRef = db.doc(`users/${userId}/translationUsage/${today}`);
  const usageSnap = await usageRef.get();

  if (!usageSnap.exists) {
    return 0;
  }

  return usageSnap.data()?.count || 0;
}

/**
 * Increment user's translation usage for today
 * @param {string} userId - User ID
 * @return {Promise<number>} New translation usage count
 */
async function incrementTranslationUsage(userId: string): Promise<number> {
  const today = getTodayDateString();
  const usageRef = db.doc(`users/${userId}/translationUsage/${today}`);

  await usageRef.set(
    {
      userId,
      date: today,
      count: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Get updated count
  const usageSnap = await usageRef.get();
  return usageSnap.data()?.count || 1;
}

/**
 * Translate text using Google Cloud Translation API
 */
export const translateText = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  // Validate request data
  const validationResult = TranslateTextRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { text, fromLanguage, toLanguage } = validationResult.data;

  try {
    // Check daily limit
    const usedToday = await getUserTranslationUsage(userId);
    const remainingBefore = DAILY_TRANSLATION_LIMIT - usedToday;

    if (remainingBefore <= 0) {
      logger.info("Translation limit reached", { userId, usedToday });

      const response = {
        success: false,
        translatedText: null,
        fromLanguage,
        toLanguage,
        remainingToday: 0,
        isLimitReached: true,
      };

      return serializeTimestamps(TranslateTextResponseSchema.parse(response));
    }

    // Perform translation using Google Cloud Translation API
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

    const [translationResponse] = await translationClient.translateText({
      parent,
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: fromLanguage,
      targetLanguageCode: toLanguage,
    });

    const translatedText =
      translationResponse.translations?.[0]?.translatedText || null;

    if (!translatedText) {
      throw new Error("No translation returned from API");
    }

    // Increment usage count
    const newCount = await incrementTranslationUsage(userId);
    const remainingAfter = Math.max(0, DAILY_TRANSLATION_LIMIT - newCount);

    logger.info("Translation successful", {
      userId,
      fromLanguage,
      toLanguage,
      textLength: text.length,
      translatedLength: translatedText.length,
      usedToday: newCount,
      remainingToday: remainingAfter,
    });

    const response = {
      success: true,
      translatedText,
      fromLanguage,
      toLanguage,
      remainingToday: remainingAfter,
      isLimitReached: remainingAfter === 0,
    };

    return serializeTimestamps(TranslateTextResponseSchema.parse(response));
  } catch (error) {
    logger.error("Translation error", error);
    handleZodError(error, "translateText");

    if (error instanceof HttpsError) {
      throw error;
    }

    // Return error response instead of throwing
    const response = {
      success: false,
      translatedText: null,
      fromLanguage,
      toLanguage,
      remainingToday: Math.max(
        0,
        DAILY_TRANSLATION_LIMIT - (await getUserTranslationUsage(userId))
      ),
      isLimitReached: false,
    };

    return serializeTimestamps(TranslateTextResponseSchema.parse(response));
  }
});

/**
 * Get user's translation usage limit status
 */
export const getTranslationLimit = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const userId = auth.uid;

  try {
    const usedToday = await getUserTranslationUsage(userId);
    const remainingToday = Math.max(0, DAILY_TRANSLATION_LIMIT - usedToday);

    const response = {
      usedToday,
      remainingToday,
      dailyLimit: DAILY_TRANSLATION_LIMIT,
      isLimitReached: remainingToday === 0,
      resetsAt: getTomorrowMidnightUTC(),
    };

    return serializeTimestamps(GetTranslationLimitResponseSchema.parse(response));
  } catch (error) {
    logger.error("Error getting translation limit", error);
    handleZodError(error, "getTranslationLimit");

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to get translation limit");
  }
});
