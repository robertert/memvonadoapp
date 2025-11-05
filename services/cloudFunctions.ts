import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import { app } from "../firebase";
import { Platform } from "react-native";

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

  // Update deck settings
  updateDeckSettings: async (deckId: string, settings: any) => {
    const updateDeckSettingsFunction = httpsCallable(
      functions,
      "updateDeckSettings"
    );
    const result = await updateDeckSettingsFunction({ deckId, settings });
    return result.data as { success: boolean };
  },

  // Copy public deck into user's space to start learning
  startLearningDeck: async (userId: string, deckId: string) => {
    const fn = httpsCallable(functions, "startLearningDeck");
    const result = await fn({ userId, deckId });
    return result.data as { success: boolean };
  },

  // User deck APIs
  getUserDeckDetails: async (userId: string, deckId: string) => {
    const fn = httpsCallable(functions, "getUserDeckDetails");
    const result = await fn({ userId, deckId });
    return result.data as { deck: any };
  },
  getUserDeckCards: async (
    userId: string,
    deckId: string,
    limit: number = 20,
    startAfter?: string
  ) => {
    const fn = httpsCallable(functions, "getUserDeckCards");
    const result = await fn({ userId, deckId, limit, startAfter });
    return result.data as {
      cards: any[];
      hasMore: boolean;
      lastDocId: string | null;
    };
  },
  getUserDueDeckCards: async (
    userId: string,
    deckId: string,
    limit: number = 100
  ) => {
    const fn = httpsCallable(functions, "getUserDueDeckCards");
    const result = await fn({ userId, deckId, limit });
    return result.data as { cards: any[] };
  },
  getUserNewDeckCards: async (
    userId: string,
    deckId: string,
    limit: number = 50
  ) => {
    const fn = httpsCallable(functions, "getUserNewDeckCards");
    const result = await fn({ userId, deckId, limit });
    return result.data as { cards: any[] };
  },

  // Update user settings
  updateUserSettings: async (userId: string, settings: UserSettings) => {
    const updateUserSettingsFunction = httpsCallable(
      functions,
      "updateUserSettings"
    );
    const result = await updateUserSettingsFunction({ userId, settings });
    return result.data as { success: boolean };
  },

  // Get user profile
  getUserProfile: async (userId: string) => {
    const getUserProfileFunction = httpsCallable(functions, "getUserProfile");
    const result = await getUserProfileFunction({ userId });
    return result.data as {
      userId: string;
      username: string;
      email: string | null;
      stats: any;
      streak: number;
      league: number;
      points: number;
      friendsCount: number;
      followers: number;
      following: number;
    };
  },

  // Get user activity heatmap
  getUserActivityHeatmap: async (userId: string, weeks: number = 16) => {
    const getUserActivityHeatmapFunction = httpsCallable(
      functions,
      "getUserActivityHeatmap"
    );
    const result = await getUserActivityHeatmapFunction({ userId, weeks });
    return result.data as {
      heatmapData: Array<{ date: string; count: number }>;
    };
  },

  // Get user awards
  getUserAwards: async (userId: string) => {
    const getUserAwardsFunction = httpsCallable(functions, "getUserAwards");
    const result = await getUserAwardsFunction({ userId });
    return result.data as { awards: any[] };
  },

  // Get friends streaks
  getFriendsStreaks: async (userId: string) => {
    const getFriendsStreaksFunction = httpsCallable(
      functions,
      "getFriendsStreaks"
    );
    const result = await getFriendsStreaksFunction({ userId });
    return result.data as {
      friendsStreaks: Array<{ userId: string; name: string; streak: number }>;
    };
  },

  // Get leaderboard (user's group ranking)
  getLeaderboard: async (userId: string, seasonId?: string) => {
    const getLeaderboardFunction = httpsCallable(functions, "getLeaderboard");
    const result = await getLeaderboardFunction({ userId, seasonId });
    return result.data as {
      entries: Array<{
        userId: string;
        username: string;
        points: number;
        position: number;
        lastActivityAt: any;
      }>;
      groupId: string | null;
      leagueNumber: number | null;
      seasonId: string;
      totalMembers: number;
    };
  },

  // Get user ranking in their group
  getUserRanking: async (userId: string, seasonId?: string) => {
    const getUserRankingFunction = httpsCallable(functions, "getUserRanking");
    const result = await getUserRankingFunction({ userId, seasonId });
    return result.data as {
      position: number | null;
      groupId: string | null;
      leagueNumber: number | null;
      points: number;
      totalMembers?: number;
    };
  },

  // Get following rankings (friends in their groups)
  getFollowingRankings: async (userId: string, seasonId?: string) => {
    const getFollowingRankingsFunction = httpsCallable(
      functions,
      "getFollowingRankings"
    );
    const result = await getFollowingRankingsFunction({ userId, seasonId });
    return result.data as {
      rankings: Array<{
        userId: string;
        username?: string;
        position: number | null;
        points: number;
        leagueNumber: number;
        groupId?: string;
        totalMembers?: number;
      }>;
    };
  },

  // Get notifications
  getNotifications: async (userId: string, limit: number = 50) => {
    const getNotificationsFunction = httpsCallable(
      functions,
      "getNotifications"
    );
    const result = await getNotificationsFunction({ userId, limit });
    return result.data as {
      notifications: Array<{
        id: string;
        title: string;
        body: string;
        type: "info" | "success" | "warning" | "error";
        read: boolean;
        createdAt: any;
        linkTo?: string;
      }>;
    };
  },

  // Mark notification as read
  markNotificationRead: async (userId: string, notificationId: string) => {
    const markNotificationReadFunction = httpsCallable(
      functions,
      "markNotificationRead"
    );
    const result = await markNotificationReadFunction({
      userId,
      notificationId,
    });
    return result.data as { success: boolean };
  },

  // Get league info
  getLeagueInfo: async (leagueNumber: number) => {
    const getLeagueInfoFunction = httpsCallable(functions, "getLeagueInfo");
    const result = await getLeagueInfoFunction({ leagueNumber });
    return result.data as {
      league: { id: number; name: string; color: string; description: string };
    };
  },

  // Get all leagues info
  getAllLeaguesInfo: async () => {
    const getAllLeaguesInfoFunction = httpsCallable(
      functions,
      "getAllLeaguesInfo"
    );
    const result = await getAllLeaguesInfoFunction({});
    return result.data as {
      leagues: Array<{
        id: number;
        name: string;
        color: string;
        description: string;
      }>;
    };
  },

  // Get user group info
  getUserGroup: async (userId: string, seasonId?: string) => {
    const getUserGroupFunction = httpsCallable(functions, "getUserGroup");
    const result = await getUserGroupFunction({ userId, seasonId });
    return result.data as {
      groupId: string | null;
      leagueNumber: number | null;
      memberCount: number;
      capacity: number;
      isFull: boolean;
    };
  },

  // Add placeholder data for testing
  addPlaceholderData: async (userId?: string, createUser?: boolean) => {
    const addPlaceholderDataFunction = httpsCallable(
      functions,
      "addPlaceholderData"
    );
    const result = await addPlaceholderDataFunction({ userId, createUser });
    return result.data as {
      success: boolean;
      userId: string;
      decksCreated: number;
      totalCards: number;
      deckIds: string[];
    };
  },
};
