import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";

const functions = getFunctions(app, "europe-west1");

// Types for Cloud Functions
export interface SearchFilters {
  subject?: string;
  difficulty?: number;
  isPublic?: boolean;
}

export interface CardData {
  front: string;
  back: string;
  tags: string[];
}

export interface UserProgress {
  stats: {
    totalCards: number;
    totalDecks: number;
    totalReviews: number;
    averageDifficulty: number;
  };
  recentSessions: any[];
  streak: number;
  lastStudyDate?: Date;
}

export interface UserSettings {
  theme?: "light" | "dark";
  notificationsEnabled?: boolean;
  dailyGoal?: number;
  language?: string;
  [key: string]: any;
}

export interface SearchLog {
  id: string;
  searchText: string;
  filters: SearchFilters;
  resultsCount: number;
  timestamp: Date;
}

// Cloud Functions calls
export const cloudFunctions = {
  // Server authoritative time
  serverNow: async () => {
    const fn = httpsCallable(functions, "serverNow");
    const result = await fn({});
    return result.data as { nowMs: number; iso: string };
  },

  // Current season window (weekly)
  getCurrentSeason: async () => {
    const fn = httpsCallable(functions, "getCurrentSeason");
    const result = await fn({});
    return result.data as {
      seasonId: string;
      startAt: any;
      endAt: any;
      status: string;
    };
  },
  // Search decks with advanced filtering
  searchDecks: async (
    searchText?: string,
    filters?: SearchFilters,
    userId?: string
  ) => {
    const searchDecksFunction = httpsCallable(functions, "searchDecks");
    const result = await searchDecksFunction({ searchText, filters, userId });
    return result.data as { results: any[]; total: number };
  },

  // Get public deck details only (without cards)
  getDeckDetails: async (deckId: string) => {
    const getDeckDetailsFunction = httpsCallable(functions, "getDeckDetails");
    const result = await getDeckDetailsFunction({ deckId });
    return result.data as { deck: any };
  },

  // Get cards for a deck with pagination
  getDeckCards: async (
    deckId: string,
    limit: number = 20,
    startAfter?: string
  ) => {
    const getDeckCardsFunction = httpsCallable(functions, "getDeckCards");
    const result = await getDeckCardsFunction({ deckId, limit, startAfter });
    return result.data as {
      cards: any[];
      hasMore: boolean;
      lastDocId: string | null;
    };
  },

  // Get due cards (server-side filter)
  getDueDeckCards: async (deckId: string, limit: number = 100) => {
    const fn = httpsCallable(functions, "getDueDeckCards");
    const result = await fn({ deckId, limit });
    return result.data as { cards: any[] };
  },

  // Get new intro candidates (server-side filter)
  getNewDeckCards: async (deckId: string, limit: number = 50) => {
    const fn = httpsCallable(functions, "getNewDeckCards");
    const result = await fn({ deckId, limit });
    return result.data as { cards: any[] };
  },

  // Get user decks with cards
  getUserDecks: async (userId: string) => {
    const getUserDecksFunction = httpsCallable(functions, "getUserDecks");
    const result = await getUserDecksFunction({ userId });
    return result.data as { decks: any[] };
  },

  // Update card progress after review
  updateCardProgress: async (
    userId: string,
    deckId: string,
    cardId: string,
    grade?: number,
    difficulty?: number,
    interval?: number,
    firstLearn?: any
  ) => {
    const updateCardProgressFunction = httpsCallable(
      functions,
      "updateCardProgress"
    );
    const result = await updateCardProgressFunction({
      userId,
      deckId,
      cardId,
      grade,
      difficulty,
      interval,
      firstLearn,
    });
    return result.data as { success: boolean };
  },

  // Create deck with cards in bulk
  createDeckWithCards: async (
    title: string,
    cards: CardData[],
    userId: string
  ) => {
    const createDeckFunction = httpsCallable(functions, "createDeckWithCards");
    const result = await createDeckFunction({ title, cards, userId });
    return result.data as { deckId: string };
  },

  // Get user search logs
  getSearchLogs: async (userId: string) => {
    const getSearchLogsFunction = httpsCallable(functions, "getSearchLogs");
    const result = await getSearchLogsFunction({ userId });
    return result.data as SearchLog[];
  },

  // Get user progress and statistics
  getUserProgress: async (userId: string) => {
    const getUserProgressFunction = httpsCallable(functions, "getUserProgress");
    const result = await getUserProgressFunction({ userId });
    return result.data as UserProgress;
  },

  // Get user settings
  getUserSettings: async (userId: string) => {
    const getUserSettingsFunction = httpsCallable(functions, "getUserSettings");
    const result = await getUserSettingsFunction({ userId });
    return result.data as { settings: UserSettings };
  },

  // Get popular public decks
  getPopularDecks: async (limit: number = 8) => {
    const fn = httpsCallable(functions, "getPopularDecks");
    const result = await fn({ limit });
    return result.data as { decks: any[] };
  },

  // Process friend requests
  processFriendRequest: async (
    fromUserId: string,
    toUserId: string,
    action: "accept" | "reject"
  ) => {
    const processFriendRequestFunction = httpsCallable(
      functions,
      "processFriendRequest"
    );
    const result = await processFriendRequestFunction({
      fromUserId,
      toUserId,
      action,
    });
    return result.data as { success: boolean };
  },

  // Reset deck progress
  resetDeck: async (deckId: string) => {
    const resetDeckFunction = httpsCallable(functions, "resetDeck");
    const result = await resetDeckFunction({ deckId });
    return result.data as { success: boolean };
  },
};
