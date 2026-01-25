import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  getFirestore,
  Query,
  CollectionReference,
} from "firebase-admin/firestore";
import { SearchLogSchema, type SearchLog } from "./types/common";
import { serializeTimestamps } from "./utils/serialization";
import { z } from "zod";
import {
  GetSearchLogsRequestSchema,
  GetSearchLogsResponseSchema,
  SearchDecksRequestSchema,
  SearchDecksResponseSchema,
} from "memvocado-types";

const db = getFirestore();

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Search decks with advanced filtering
 */
export const searchDecks = onCall(async (request) => {
  const parsed = SearchDecksRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { searchText, filters, userId, limit = 20 } = parsed.data;

  if (!searchText && !filters) {
    throw new HttpsError("invalid-argument", "Search text or filters required");
  }

  try {
    let query: Query | CollectionReference = db.collection("decks");

    // Always filter out deleted decks (use != true to handle undefined)
    // Note: Firestore doesn't support != directly, so we filter after if needed
    // For now, we'll filter in memory after the query
    // TODO: Consider using composite index if performance becomes an issue

    // Apply text search (case-insensitive using title_lower)
    if (searchText) {
      const searchTextLower = searchText.toLowerCase();
      query = query
        .where("title_lower", ">=", searchTextLower)
        .where("title_lower", "<=", searchTextLower + "\uf8ff")
        .where("is_deleted", "==", false);
    }

    // Apply filters
    if (filters) {
      const { category, tags } = filters;

      if (category) {
        query = query.where("category", "==", category);
      }

      // Use array-contains-any only when we have a non‑empty array
      if (Array.isArray(tags) && tags.length > 0) {
        query = query.where("tags", "array-contains-any", tags);
      }
    }

    const snapshot = await query.limit(limit).get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Log search for analytics
    if (userId) {
      // Waliduj i typuj search log przed zapisem
      const logData: Omit<SearchLog, "id"> = {
        userId,
        searchText: searchText || "",
        resultsCount: results.length,
        timestamp: new Date(),
        filters: filters || {},
      };
      SearchLogSchema.omit({ id: true }).parse(logData);

      await db
        .collection("users")
        .doc(userId)
        .collection("searchLogs")
        .add(logData);
    }

    const rawResponse = { results, total: results.length };
    SearchDecksResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error searching decks", error);
    handleZodError(error, "searchDecks");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Search failed");
  }
});

/**
 * Get search logs
 */
export const getSearchLogs = onCall(async (request) => {
  const parsed = GetSearchLogsRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId } = parsed.data;

  try {
    const logsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("searchLogs")
      .orderBy("timestamp", "desc")
      .get();
    const logs = logsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const rawResponse = { logs };
    GetSearchLogsResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting search logs", error);
    handleZodError(error, "getSearchLogs");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get search logs");
  }
});
