import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {
  getFirestore,
  Query,
  CollectionReference,
} from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Search decks with advanced filtering
 */
export const searchDecks = onCall(async (request) => {
  const { searchText, filters, userId } = request.data;

  if (!searchText && !filters) {
    throw new Error("Search text or filters required");
  }

  try {
    let query: Query | CollectionReference = db.collection("decks");

    // Apply text search
    if (searchText) {
      query = query
        .where("title", ">=", searchText)
        .where("title", "<=", searchText + "\uf8ff");
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

    const snapshot = await query.limit(20).get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Log search for analytics
    if (userId) {
      await db.collection("users").doc(userId).collection("searchLogs").add({
        userId,
        searchText,
        filters,
        resultsCount: results.length,
        timestamp: new Date(),
      });
    }

    return { results, total: results.length };
  } catch (error) {
    logger.error("Error searching decks", error);
    throw new Error("Search failed");
  }
});

/**
 * Get search logs
 */
export const getSearchLogs = onCall(async (request) => {
  const { userId } = request.data;
  const logs = await db
    .collection("users")
    .doc(userId)
    .collection("searchLogs")
    .get();
  return logs.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
});
