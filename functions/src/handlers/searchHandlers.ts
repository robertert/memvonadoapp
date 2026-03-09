import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  GetSearchLogsRequestSchema,
  GetSearchLogsResponseSchema,
  SearchDecksRequestSchema,
  SearchDecksResponseSchema,
} from "memvocado-types";
import { serializeTimestamps } from "../utils/serialization";
import { FirestoreDeckRepository } from "../repositories/firestore/FirestoreDeckRepository";
import { FirestoreUserRepository } from "../repositories/firestore/FirestoreUserRepository";
import { SearchService } from "../services/SearchService";

const deckRepo = new FirestoreDeckRepository();
const userRepo = new FirestoreUserRepository();
const searchService = new SearchService(deckRepo, userRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

export const searchDecks = onCall(async (request) => {
  const parsed = SearchDecksRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { searchText, filters, userId, limit = 20 } = parsed.data;

  if (!searchText && !filters) {
    throw new HttpsError("invalid-argument", "Search text or filters required");
  }

  try {
    const { results, total } = await searchService.searchDecks({ searchText, filters, userId, limit });
    const rawResponse = { results, total };
    SearchDecksResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error searching decks", error);
    handleZodError(error, "searchDecks");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Search failed");
  }
});

export const getSearchLogs = onCall(async (request) => {
  const parsed = GetSearchLogsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  const { userId } = parsed.data;

  try {
    const logs = await searchService.getSearchLogs(userId);
    const rawResponse = { logs };
    GetSearchLogsResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting search logs", error);
    handleZodError(error, "getSearchLogs");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get search logs");
  }
});
