import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  TranslateTextRequestSchema,
  TranslateTextResponseSchema,
  GetTranslationLimitResponseSchema,
  GetTranslationSuggestionsRequestSchema,
  GetTranslationSuggestionsResponseSchema,
} from "memvocado-types/schemas/api/translation";
import { serializeTimestamps } from "../utils/serialization";
import { FirestoreUsageRepository } from "../repositories/firestore/FirestoreUsageRepository";
import { TranslationService } from "../services/TranslationService";

const usageRepo = new FirestoreUsageRepository("translationUsage");
const translationService = new TranslationService(usageRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

export const translateText = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = request.auth.uid;

  const parsed = TranslateTextRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { text, fromLanguage, toLanguage } = parsed.data;

  try {
    const result = await translationService.translate({ userId, text, fromLanguage, toLanguage });
    return serializeTimestamps(TranslateTextResponseSchema.parse(result));
  } catch (error) {
    logger.error("Translation error", error);
    handleZodError(error, "translateText");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to translate text");
  }
});

export const getTranslationLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = request.auth.uid;

  try {
    const result = await translationService.getLimit(userId);
    return serializeTimestamps(GetTranslationLimitResponseSchema.parse(result));
  } catch (error) {
    logger.error("Error getting translation limit", error);
    handleZodError(error, "getTranslationLimit");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get translation limit");
  }
});

export const getTranslationSuggestions = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

    const parsed = GetTranslationSuggestionsRequestSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid request data");

    const { text, fromLanguage, toLanguage } = parsed.data;

    try {
      const suggestions = await translationService.getSuggestions({ text, fromLanguage, toLanguage });
      return GetTranslationSuggestionsResponseSchema.parse({ suggestions, cached: false });
    } catch (error) {
      logger.error("getSuggestions error", error);
      throw new HttpsError("internal", "Translation failed");
    }
  }
);
