import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  getFirestore,
  Query,
  CollectionReference,
} from "firebase-admin/firestore";
import { SearchLogSchema, type SearchLog } from "./types/common";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

/**
 * Search decks with advanced filtering
 */
export const searchDecks = onCall(async (request) => {
  const { searchText, filters, userId, limit = 20 } = request.data;

  if (!searchText && !filters) {
    throw new Error("Search text or filters required");
  }

  try {
    let query: Query | CollectionReference = db.collection("decks");

    // Always filter out deleted decks (use != true to handle undefined)
    // Note: Firestore doesn't support != directly, so we filter after if needed
    // For now, we'll filter in memory after the query
    // TODO: Consider using composite index if performance becomes an issue

    // Apply text search
    if (searchText) {
      query = query
        .where("title", ">=", searchText)
        .where("title", "<=", searchText + "\uf8ff")
        .where("is_deleted", "==", false);
    }

    // Apply filters
    if (filters) {
      if (filters.subject) {
        query = query.where("subject", "==", filters.subject);
      }
      if (filters.difficulty) {
        query = query.where("difficulty", "==", filters.difficulty);
      }
      if (filters.isPublic !== undefined) {
        query = query.where("isPublic", "==", filters.isPublic);
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

    return serializeTimestamps({ results, total: results.length });
  } catch (error) {
    logger.error("Error searching decks", error);
    throw new Error("Search failed");
  }
});

/**
 * Get search logs
 */
export const getSearchLogs = onCall(async (request) => {
  const { userId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  const logsSnapshot = await db
    .collection("users")
    .doc(userId)
    .collection("searchLogs")
    .orderBy("timestamp", "desc")
    .get();
  return logsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
});
