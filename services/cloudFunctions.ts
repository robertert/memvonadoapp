import {
  getFunctions,
  httpsCallable,
  httpsCallableFromURL,
  connectFunctionsEmulator,
} from "firebase/functions";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { app } from "../firebase";
import { auth } from "../firebase";

const functions = getFunctions(app, "europe-west1");

// Types for Cloud Functions - re-eksport z centralnego katalogu types
import type {
  SearchFilters,
  CardCore,
  UserProgress,
  UserSettings,
  SearchLog,
  Deck,
  DeckCore,
  User,
  CardGrade,
  DeckLearningData,
  Card,
  DeckSettingsUpdate,
  DailyStats,
} from "@/types";
import {
  SuccessResponseSchema,
  SuccessResponse,
} from "@/types/schemas/api_refs";
import {
  GetUserDecksRequest,
  UpdateUserStreakIfQualifiedRequest,
  UpdateUserStreakIfQualifiedResponseSchema,
  UpdateUserStreakIfQualifiedResponse,
  UpdateUserStreakOnLoginRequest,
  UpdateUserStreakOnLoginResponse,
  UpdateUserStreakOnLoginResponseSchema,
  UpdateCardProgressRequest,
  GetUserProgressRequest,
  GetUserProgressResponse,
  GetUserProgressResponseSchema,
  GetUserSettingsRequest,
  GetUserSettingsResponse,
  GetUserSettingsResponseSchema,
  GetUserProfileRequest,
  GetUserProfileResponse,
  GetUserProfileResponseSchema,
  GetUserActivityHeatmapRequest,
  GetUserActivityHeatmapResponse,
  GetUserActivityHeatmapResponseSchema,
  GetUserAwardsRequest,
  GetUserAwardsResponse,
  GetUserAwardsResponseSchema,
  SubmitPointsRequest,
  SubmitPointsResponse,
  SubmitPointsResponseSchema,
  UpdateUserSettingsRequest,
  ServerNow,
  ServerNowSchema,
  GetCurrentSeasonResponse,
  GetCurrentSeasonResponseSchema,
  WeeklyRollOverResponse,
  WeeklyRollOverResponseSchema,
  UndoCardRequest,
  UndoCardResponse,
  UndoCardResponseSchema,
  UpdateCardProgressAllInOneRequest,
  UpdateCardProgressAllInOneResponse,
  UpdateCardProgressAllInOneResponseSchema,
} from "@/types/schemas/api/user";
import {
  GetFriendsStreaksRequest,
  GetFriendsStreaksResponse,
  GetFriendsStreaksResponseSchema,
} from "@/types/schemas/api_refs";
import {
  GetLeagueInfoRequestSchema,
  GetUserGroupRequestSchema,
  GetLeagueInfoRequest,
  GetLeagueInfoResponse,
  GetAllLeaguesInfoResponse,
  GetUserGroupRequest,
  GetUserGroupResponse,
  GetLeagueInfoResponseSchema,
  GetAllLeaguesInfoResponseSchema,
  GetUserGroupResponseSchema,
} from "@/types/schemas/api/league";
import {
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  GetUserRankingRequest,
  GetUserRankingResponse,
  GetFollowingRankingsRequest,
  GetFollowingRankingsResponse,
  GetLeaderboardResponseSchema,
  GetUserRankingResponseSchema,
  GetFollowingRankingsResponseSchema,
} from "@/types/schemas/api/ranking";
import {
  GetNotificationsRequest,
  GetNotificationsResponse,
  GetNotificationsResponseSchema,
  MarkNotificationReadRequest,
  MarkNotificationReadResponse,
  MarkNotificationReadResponseSchema,
} from "@/types/schemas/api/notification";

import {
  AddPlaceholderDataRequest,
  AddPlaceholderDataResponse,
  AddPlaceholderDataResponseSchema,
} from "@/types/schemas/api/placeholder";
import {
  GetSearchLogsRequest,
  GetSearchLogsResponse,
  GetSearchLogsResponseSchema,
  SearchDecksRequest,
  SearchDecksResponseSchema,
  SearchDecksResponse,
} from "@/types/schemas/api/search";
import type {
  GetDeckDetailsResponse,
  GetDeckCardsResponse,
  GetUserDecksResponse,
  CreateDeckWithCardsResponse,
  GetUserDeckDetailsResponse,
  GetUserDeckCardsResponse,
  GetUserDueDeckCardsResponse,
  GetUserNewDeckCardsResponse,
  DeleteDeckResponse,
  CheckCardChangesResponse,
  SyncDeckCardsResponse,
  StartLearningDeckResponse,
} from "@/types/schemas/api_refs";
import {
  CreateDeckWithCardsRequest,
  GetDeckDetailsRequest,
  GetDeckCardsRequest,
  GetPopularDecksRequest,
  GetPopularDecksResponse,
  GetPopularDecksResponseSchema,
  GetUserDeckDetailsRequest,
  GetUserDeckCardsRequest,
  GetUserDueDeckCardsRequest,
  GetUserNewDeckCardsRequest,
  ResetDeckRequest,
  UpdateDeckSettingsRequest,
  UpdateUserDeckSettingsRequest,
  StartLearningDeckRequest,
  DeleteDeckRequest,
  CheckCardChangesRequest,
  SyncDeckCardsRequest,
  UpdateCardContentRequest,
  UpdateCardContentResponse,
  UpdateCardContentResponseSchema,
  UpdateDeckRequest,
  UpdateDeckResponse,
  UpdateDeckResponseSchema,
  ImportAnkiDeckRequest,
  ImportAnkiDeckResponse,
  ImportAnkiDeckResponseSchema,
  CreateDeckWithCardsResponseSchema,
  GetDeckDetailsResponseSchema,
  GetDeckCardsResponseSchema,
  GetUserDecksResponseSchema,
  GetUserDeckDetailsResponseSchema,
  GetUserDeckCardsResponseSchema,
  GetUserDueDeckCardsResponseSchema,
  GetUserNewDeckCardsResponseSchema,
  StartLearningDeckResponseSchema,
  DeleteDeckResponseSchema,
  CheckCardChangesResponseSchema,
  SyncDeckCardsResponseSchema,
  StartLearningSessionRequest,
  StartLearningSessionResponse,
  StartLearningSessionResponseSchema,
  GetDeckDailyStatsRequest,
  GetDeckDailyStatsResponse,
  GetDeckDailyStatsResponseSchema,
  GetDailyUserStatsRequest,
  GetDailyUserStatsResponse,
  GetDailyUserStatsResponseSchema,
  RecordDeckViewRequest,
  RecordDeckViewResponse,
  RecordDeckViewResponseSchema,
  ToggleDeckLikeRequest,
  ToggleDeckLikeResponse,
  ToggleDeckLikeResponseSchema,
  CheckIfLikedRequest,
  CheckIfLikedResponse,
  CheckIfLikedResponseSchema,
  AddCardToDeckRequest,
  AddCardToDeckResponse,
  AddCardToDeckResponseSchema,
} from "@/types/schemas/api/deck";
import {
  CheckUsernameAvailabilityRequest,
  CheckUsernameAvailabilityResponse,
  CheckUsernameAvailabilityResponseSchema,
  EnsureUserDocumentRequest,
  EnsureUserDocumentResponse,
  EnsureUserDocumentResponseSchema,
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
  CompleteOnboardingResponseSchema,
} from "@/types/schemas/api/auth";
import {
  ScanDocumentRequest,
  ScanDocumentResponse,
  ScanDocumentResponseSchema,
} from "@/types/schemas/api/scanning";
import {
  ProcessFileRequest,
  ProcessFileResponse,
  ProcessFileResponseSchema,
} from "@/types/schemas/api/processFile";
import {
  GetAvocadoStatusRequest,
  GetAvocadoStatusResponse,
  GetAvocadoStatusResponseSchema,
  HarvestAvocadoRequest,
  HarvestAvocadoResponse,
  HarvestAvocadoResponseSchema,
  GetAvocadoConfigRequest,
  GetAvocadoConfigResponse,
  GetAvocadoConfigResponseSchema,
} from "@/types/schemas/avocado";
import {
  TranslateTextRequest,
  TranslateTextResponse,
  TranslateTextResponseSchema,
  GetTranslationLimitRequest,
  GetTranslationLimitResponse,
  GetTranslationLimitResponseSchema,
  SupportedLanguage,
} from "@/types/schemas/api/translation";
import {
  ExtractTextFromImageRequest,
  ExtractTextFromImageResponse,
  ExtractTextFromImageResponseSchema,
} from "@/types/schemas/api/ocr";

// Cloud Functions calls
export const cloudFunctions = {
  // Check username availability
  checkUsernameAvailability: async (username: string) => {
    const fn = httpsCallable<
      CheckUsernameAvailabilityRequest,
      CheckUsernameAvailabilityResponse
    >(functions, "checkUsernameAvailability");
    const result = await fn({ username });
    const validatedData = CheckUsernameAvailabilityResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from checkUsernameAvailability");
    }
    return validatedData.data;
  },

  // Ensure user document exists - tworzy podstawowy dokument po rejestracji
  ensureUserDocument: async () => {
    const fn = httpsCallable<
      EnsureUserDocumentRequest,
      EnsureUserDocumentResponse
    >(functions, "ensureUserDocument");
    const result = await fn({});
    const validatedData = EnsureUserDocumentResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from ensureUserDocument");
    }
    return validatedData.data;
  },

  // Complete onboarding - zapisuje wszystkie dane użytkownika (username, photo, interests)
  completeOnboarding: async (data: {
    username: string;
    photoUrl?: string;
    interests: string[];
  }) => {
    const fn = httpsCallable<
      CompleteOnboardingRequest,
      CompleteOnboardingResponse
    >(functions, "completeOnboarding");
    const result = await fn(data);
    const validatedData = CompleteOnboardingResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from completeOnboarding");
    }
    return validatedData.data;
  },

  // Server authoritative time
  serverNow: async () => {
    const fn = httpsCallable<Record<string, never>, ServerNow>(
      functions,
      "serverNow"
    );
    const result = await fn({});
    const validatedData = ServerNowSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from serverNow");
    }
    return validatedData.data;
  },

  updateUserStreakIfQualified: async () => {
    const fn = httpsCallable<
      UpdateUserStreakIfQualifiedRequest,
      UpdateUserStreakIfQualifiedResponse
    >(functions, "updateUserStreakIfQualified");
    const result = await fn({});
    const validatedData = UpdateUserStreakIfQualifiedResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateUserStreakIfQualified");
    }
    return validatedData.data;
  },

  // Current season window (weekly)
  getCurrentSeason: async () => {
    const fn = httpsCallable<Record<string, never>, GetCurrentSeasonResponse>(
      functions,
      "getCurrentSeason"
    );
    const result = await fn({});
    const validatedData = GetCurrentSeasonResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getCurrentSeason");
    }
    return validatedData.data;
  },
  // Search decks with advanced filtering
  searchDecks: async (
    searchText?: string,
    filters?: SearchFilters,
    userId?: string,
    limit: number = 20
  ) => {
    const searchDecksFunction = httpsCallable<
      SearchDecksRequest,
      SearchDecksResponse
    >(functions, "searchDecks");
    const result = await searchDecksFunction({
      searchText,
      filters,
      userId,
      limit,
    });
    const validatedData = SearchDecksResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from searchDecks");
    }
    return validatedData.data;
  },

  // Get public deck details only (without cards)
  getDeckDetails: async (deckId: string) => {
    const getDeckDetailsFunction = httpsCallable<
      GetDeckDetailsRequest,
      GetDeckDetailsResponse
    >(functions, "getDeckDetails");
    const result = await getDeckDetailsFunction({ deckId });
    const validatedData = GetDeckDetailsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getDeckDetails");
    }
    return validatedData.data;
  },

  // Get cards for a deck with pagination
  getDeckCards: async (
    deckId: string,
    limit: number = 20,
    startAfter: string | null = null
  ) => {
    const getDeckCardsFunction = httpsCallable<
      GetDeckCardsRequest,
      GetDeckCardsResponse
    >(functions, "getDeckCards");
    const result = await getDeckCardsFunction({ deckId, limit, startAfter });
    const validatedData = GetDeckCardsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getDeckCards");
    }
    return validatedData.data;
  },

  // Get user decks with cards
  getUserDecks: async (userId: string) => {
    const getUserDecksFunction = httpsCallable<
      GetUserDecksRequest,
      GetUserDecksResponse
    >(functions, "getUserDecks");
    const result = await getUserDecksFunction({ userId });
    const validatedData = GetUserDecksResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserDecks");
    }
    return validatedData.data;
  },

  scanDocument: async (storagePath: string, mimeType: string) => {
    const scanDocumentFunction = httpsCallable<
      ScanDocumentRequest,
      ScanDocumentResponse
    >(functions, "scanDocument");
    const result = await scanDocumentFunction({ storagePath, mimeType });
    const validatedData = ScanDocumentResponseSchema.safeParse(result.data);

    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from scanDocument");
    }
    return validatedData.data;
  },

  processFile: async (
    storagePath: string,
    mimeType: string,
    hint?: string,
    fileName?: string,
    detail: "low" | "medium" | "high" = "medium"
  ) => {
    const fn = httpsCallable<ProcessFileRequest, ProcessFileResponse>(
      functions,
      "processFile"
    );
    const result = await fn({ storagePath, mimeType, hint, fileName, detail });
    const validatedData = ProcessFileResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from processFile");
    }
    return validatedData.data;
  },

  // Undo card
  undoCard: async (deckId: string, card: Card, dailyStats: DailyStats) => {
    const undoCardFunction = httpsCallable<UndoCardRequest, UndoCardResponse>(
      functions,
      "undoCard"
    );
    const result = await undoCardFunction({ deckId, card, dailyStats });
    const validatedData = UndoCardResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from undoCard");
    }
    return validatedData.data;
  },

  // Get daily user stats
  getDailyUserStats: async () => {
    const getDailyUserStatsFunction = httpsCallable<
      GetDailyUserStatsRequest,
      GetDailyUserStatsResponse
    >(functions, "getDailyUserStats");
    const result = await getDailyUserStatsFunction({});
    const validatedData = GetDailyUserStatsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getDailyUserStats");
    }
    return validatedData.data.dailyStats;
  },
  // Update card progress after review
  updateCardProgress: async (
    userId: string,
    deckId: string,
    card: Card,
    scheduledTime: number,
    dailyStats?: DailyStats
  ) => {
    const updateCardProgressFunction = httpsCallable<
      UpdateCardProgressRequest,
      SuccessResponse
    >(functions, "updateCardProgress");
    const result = await updateCardProgressFunction({
      userId,
      deckId,
      card,
      scheduledTime,
      dailyStats,
    });
    const validatedData = SuccessResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateCardProgress");
    }
    return validatedData.data;
  },

  // Update card progress all in one
  updateCardProgressAllInOne: async (isIncrement: boolean) => {
    const updateCardProgressAllInOneFunction = httpsCallable<
      UpdateCardProgressAllInOneRequest,
      UpdateCardProgressAllInOneResponse
    >(functions, "updateCardProgressAllInOne");
    const result = await updateCardProgressAllInOneFunction({ isIncrement });
    const validatedData = UpdateCardProgressAllInOneResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateCardProgressAllInOne");
    }
    return validatedData.data;
  },
  // Create deck with cards in bulk
  createDeckWithCards: async (deckData: DeckCore, cards: CardCore[]) => {
    const createDeckFunction = httpsCallable<
      CreateDeckWithCardsRequest,
      CreateDeckWithCardsResponse
    >(functions, "createDeckWithCards");
    const result = await createDeckFunction({ deckData, cards });
    const validatedData = CreateDeckWithCardsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from createDeckWithCards");
    }
    return validatedData.data;
  },

  // Get user search logs
  getSearchLogs: async (userId: string) => {
    const getSearchLogsFunction = httpsCallable<
      GetSearchLogsRequest,
      GetSearchLogsResponse
    >(functions, "getSearchLogs");
    const result = await getSearchLogsFunction({ userId });
    const validatedData = GetSearchLogsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getSearchLogs");
    }
    return validatedData.data;
  },

  // Get user progress and statistics
  getUserProgress: async (userId: string) => {
    const getUserProgressFunction = httpsCallable<
      GetUserProgressRequest,
      GetUserProgressResponse
    >(functions, "getUserProgress");
    const result = await getUserProgressFunction({ userId });
    const validatedData = GetUserProgressResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserProgress");
    }
    return validatedData.data.userProgress;
  },

  // Update user's streak on app launch (timezone-aware)
  updateUserStreakOnLogin: async () => {
    const fn = httpsCallable<
      UpdateUserStreakOnLoginRequest,
      UpdateUserStreakOnLoginResponse
    >(functions, "updateUserStreakOnLogin");
    const result = await fn({});
    const validatedData = UpdateUserStreakOnLoginResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateUserStreakOnLogin");
    }
    return validatedData.data;
  },

  // Get user settings
  getUserSettings: async (userId: string) => {
    const getUserSettingsFunction = httpsCallable<
      GetUserSettingsRequest,
      GetUserSettingsResponse
    >(functions, "getUserSettings");
    const result = await getUserSettingsFunction({ userId });
    const validatedData = GetUserSettingsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserSettings");
    }
    return validatedData.data;
  },

  // Get popular public decks
  getPopularDecks: async (limit: number = 8) => {
    const fn = httpsCallable<GetPopularDecksRequest, GetPopularDecksResponse>(
      functions,
      "getPopularDecks"
    );
    const result = await fn({ limit });
    const validatedData = GetPopularDecksResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getPopularDecks");
    }
    return validatedData.data;
  },

  // Reset deck progress
  resetDeck: async (deckId: string) => {
    const resetDeckFunction = httpsCallable<ResetDeckRequest, SuccessResponse>(
      functions,
      "resetDeck"
    );
    const result = await resetDeckFunction({ deckId });
    const validatedData = SuccessResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from resetDeck");
    }
    return validatedData.data;
  },

  // Update deck settings
  updateDeckSettings: async (deckId: string, deck: Deck) => {
    const updateDeckSettingsFunction = httpsCallable<
      UpdateDeckSettingsRequest,
      SuccessResponse
    >(functions, "updateDeckSettings");
    const result = await updateDeckSettingsFunction({ deckId, deck });
    const validatedData = SuccessResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateDeckSettings");
    }
    return validatedData.data;
  },

  updateUserDeckSettings: async (
    deckId: string,
    settings: DeckSettingsUpdate
  ) => {
    const updateUserDeckSettingsFunction = httpsCallable<
      UpdateUserDeckSettingsRequest,
      SuccessResponse
    >(functions, "updateUserDeckSettings");
    const result = await updateUserDeckSettingsFunction({
      deckId,
      settings,
    });
    const validatedData = SuccessResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateUserDeckSettings");
    }
    return validatedData.data;
  },

  // Copy public deck into user's space to start learning
  startLearningDeck: async (deckId: string) => {
    const fn = httpsCallable<
      StartLearningDeckRequest,
      StartLearningDeckResponse
    >(functions, "startLearningDeck");
    const result = await fn({ deckId });
    const validatedData = StartLearningDeckResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from startLearningDeck");
    }
    return validatedData.data;
  },

  // Delete deck (soft delete)
  deleteDeck: async (deckId: string) => {
    const fn = httpsCallable<DeleteDeckRequest, DeleteDeckResponse>(
      functions,
      "deleteDeck"
    );
    const result = await fn({ deckId });
    const validatedData = DeleteDeckResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from deleteDeck");
    }
    return validatedData.data;
  },

  // Check for card changes between source and local copy
  checkCardChanges: async (deckId: string) => {
    const fn = httpsCallable<CheckCardChangesRequest, CheckCardChangesResponse>(
      functions,
      "checkCardChanges"
    );
    const result = await fn({ deckId });
    const validatedData = CheckCardChangesResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from checkCardChanges");
    }
    return validatedData.data;
  },

  // Synchronize user's local cards with source deck
  syncDeckCards: async (
    deckId: string,
    syncAll: boolean = false,
    cardIds: string[] = []
  ) => {
    const fn = httpsCallable<SyncDeckCardsRequest, SyncDeckCardsResponse>(
      functions,
      "syncDeckCards"
    );
    const result = await fn({ deckId, syncAll, cardIds });
    const validatedData = SyncDeckCardsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from syncDeckCards");
    }
    return validatedData.data;
  },

  // User deck APIs
  getUserDeckDetails: async (deckId: string) => {
    const fn = httpsCallable<
      GetUserDeckDetailsRequest,
      GetUserDeckDetailsResponse
    >(functions, "getUserDeckDetails");
    const result = await fn({ deckId });
    const validatedData = GetUserDeckDetailsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserDeckDetails");
    }
    return validatedData.data;
  },
  getUserDeckCards: async (
    deckId: string,
    limit: number = 20,
    startAfter?: string
  ) => {
    const fn = httpsCallable<GetUserDeckCardsRequest, GetUserDeckCardsResponse>(
      functions,
      "getUserDeckCards"
    );
    const result = await fn({ deckId, limit, startAfter });
    const validatedData = GetUserDeckCardsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserDeckCards");
    }
    return validatedData.data;
  },
  getUserDueDeckCards: async (deckId: string) => {
    const fn = httpsCallable<
      GetUserDueDeckCardsRequest,
      GetUserDueDeckCardsResponse
    >(functions, "getUserDueDeckCards");
    const result = await fn({ deckId });
    const validatedData = GetUserDueDeckCardsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserDueDeckCards");
    }
    return validatedData.data;
  },
  getUserNewDeckCards: async (deckId: string) => {
    const fn = httpsCallable<
      GetUserNewDeckCardsRequest,
      GetUserNewDeckCardsResponse
    >(functions, "getUserNewDeckCards");
    const result = await fn({ deckId });
    const validatedData = GetUserNewDeckCardsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserNewDeckCards");
    }
    return validatedData.data;
  },

  startLearningSession: async (deckId: string) => {
    const fn = httpsCallable<
      StartLearningSessionRequest,
      StartLearningSessionResponse
    >(functions, "startLearningSession");
    const result = await fn({ deckId });
    const validatedData = StartLearningSessionResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from startLearningSession");
    }
    return validatedData.data;
  },

  getDeckDailyStats: async (deckId: string) => {
    const fn = httpsCallable<
      GetDeckDailyStatsRequest,
      GetDeckDailyStatsResponse
    >(functions, "getDeckDailyStats");
    const result = await fn({ deckId });
    const validatedData = GetDeckDailyStatsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getDeckDailyStats");
    }
    return validatedData.data;
  },

  // Update user settings
  updateUserSettings: async (userId: string, settings: UserSettings) => {
    const updateUserSettingsFunction = httpsCallable<
      UpdateUserSettingsRequest,
      SuccessResponse
    >(functions, "updateUserSettings");
    const result = await updateUserSettingsFunction({ userId, settings });
    const validatedData = SuccessResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateUserSettings");
    }
    return validatedData.data;
  },

  // Get user profile
  getUserProfile: async (userId: string) => {
    const getUserProfileFunction = httpsCallable<
      GetUserProfileRequest,
      GetUserProfileResponse
    >(functions, "getUserProfile");
    const result = await getUserProfileFunction({ userId });
    const validatedData = GetUserProfileResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserProfile");
    }
    return validatedData.data;
  },

  // Get user activity heatmap
  getUserActivityHeatmap: async (userId: string, weeks: number = 16) => {
    const getUserActivityHeatmapFunction = httpsCallable<
      GetUserActivityHeatmapRequest,
      GetUserActivityHeatmapResponse
    >(functions, "getUserActivityHeatmap");
    const result = await getUserActivityHeatmapFunction({ userId, weeks });
    const validatedData = GetUserActivityHeatmapResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserActivityHeatmap");
    }
    return validatedData.data;
  },

  // Get user awards
  getUserAwards: async (userId: string) => {
    const getUserAwardsFunction = httpsCallable<
      GetUserAwardsRequest,
      GetUserAwardsResponse
    >(functions, "getUserAwards");
    const result = await getUserAwardsFunction({ userId });
    const validatedData = GetUserAwardsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserAwards");
    }
    return validatedData.data;
  },

  // Submit points for current season
  submitPoints: async (userId: string, delta: number) => {
    const fn = httpsCallable<SubmitPointsRequest, SubmitPointsResponse>(
      functions,
      "submitPoints"
    );
    const result = await fn({ userId, delta });
    const validatedData = SubmitPointsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from submitPoints");
    }
    return validatedData.data;
  },

  // Weekly season roll-over
  weeklyRollOver: async () => {
    const fn = httpsCallable<Record<string, never>, WeeklyRollOverResponse>(
      functions,
      "weeklyRollOver"
    );
    const result = await fn({});
    const validatedData = WeeklyRollOverResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from weeklyRollOver");
    }
    return validatedData.data;
  },

  // Get friends streaks
  getFriendsStreaks: async (userId: string) => {
    const getFriendsStreaksFunction = httpsCallable<
      GetFriendsStreaksRequest,
      GetFriendsStreaksResponse
    >(functions, "getFriendsStreaks");
    const result = await getFriendsStreaksFunction({ userId });
    const validatedData = GetFriendsStreaksResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getFriendsStreaks");
    }
    return validatedData.data;
  },

  // Get leaderboard (user's group ranking)
  getLeaderboard: async (userId: string, seasonId?: string) => {
    const getLeaderboardFunction = httpsCallable<
      GetLeaderboardRequest,
      GetLeaderboardResponse
    >(functions, "getLeaderboard");
    const result = await getLeaderboardFunction({ userId, seasonId });
    const validatedData = GetLeaderboardResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getLeaderboard");
    }
    return validatedData.data;
  },

  // Get user ranking in their group
  getUserRanking: async (userId: string, seasonId?: string) => {
    const getUserRankingFunction = httpsCallable<
      GetUserRankingRequest,
      GetUserRankingResponse
    >(functions, "getUserRanking");
    const result = await getUserRankingFunction({ userId, seasonId });
    const validatedData = GetUserRankingResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserRanking");
    }
    return validatedData.data;
  },

  // Get following rankings (friends in their groups)
  getFollowingRankings: async (userId: string, seasonId?: string) => {
    const getFollowingRankingsFunction = httpsCallable<
      GetFollowingRankingsRequest,
      GetFollowingRankingsResponse
    >(functions, "getFollowingRankings");
    const result = await getFollowingRankingsFunction({ userId, seasonId });
    const validatedData = GetFollowingRankingsResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getFollowingRankings");
    }
    return validatedData.data;
  },

  // Get notifications
  getNotifications: async (userId: string, limit: number = 50) => {
    const getNotificationsFunction = httpsCallable<
      GetNotificationsRequest,
      GetNotificationsResponse
    >(functions, "getNotifications");
    const result = await getNotificationsFunction({ userId, limit });
    const validatedData = GetNotificationsResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getNotifications");
    }
    return validatedData.data;
  },

  // Mark notification as read
  markNotificationRead: async (userId: string, notificationId: string) => {
    const markNotificationReadFunction = httpsCallable<
      MarkNotificationReadRequest,
      MarkNotificationReadResponse
    >(functions, "markNotificationRead");
    const result = await markNotificationReadFunction({
      userId,
      notificationId,
    });
    const validatedData = MarkNotificationReadResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from markNotificationRead");
    }
    return validatedData.data;
  },

  // Get league info
  getLeagueInfo: async (leagueNumber: number) => {
    const getLeagueInfoFunction = httpsCallable<
      GetLeagueInfoRequest,
      GetLeagueInfoResponse
    >(functions, "getLeagueInfo");
    const result = await getLeagueInfoFunction({ leagueNumber });
    const validatedData = GetLeagueInfoResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getLeagueInfo");
    }
    return validatedData.data;
  },

  // Get all leagues info
  getAllLeaguesInfo: async () => {
    const getAllLeaguesInfoFunction = httpsCallable<
      Record<string, never>,
      GetAllLeaguesInfoResponse
    >(functions, "getAllLeaguesInfo");
    const result = await getAllLeaguesInfoFunction({});
    const validatedData = GetAllLeaguesInfoResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getAllLeaguesInfo");
    }
    return validatedData.data;
  },

  // Get user group info
  getUserGroup: async (userId: string, seasonId?: string) => {
    const getUserGroupFunction = httpsCallable<
      GetUserGroupRequest,
      GetUserGroupResponse
    >(functions, "getUserGroup");
    const result = await getUserGroupFunction({ userId, seasonId });
    const validatedData = GetUserGroupResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getUserGroup");
    }
    return validatedData.data;
  },

  // Add placeholder data for testing
  addPlaceholderData: async (userId?: string, createUser?: boolean) => {
    const addPlaceholderDataFunction = httpsCallable<
      AddPlaceholderDataRequest,
      AddPlaceholderDataResponse
    >(functions, "addPlaceholderData");
    const result = await addPlaceholderDataFunction({ userId, createUser });
    const validatedData = AddPlaceholderDataResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from addPlaceholderData");
    }
    return validatedData.data;
  },

  // Update card content (cardData and tags) - only for source deck authors
  updateCardContent: async (
    deckId: string,
    cardId: string,
    cardData: CardCore
  ) => {
    const fn = httpsCallable<
      UpdateCardContentRequest,
      UpdateCardContentResponse
    >(functions, "updateCardContent");
    const result = await fn({ deckId, cardId, cardData });
    const validatedData = UpdateCardContentResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateCardContent");
    }
    return validatedData.data;
  },

  // Update deck with cards - accepts only changes (created, updated, deleted)
  updateDeck: async (
    deckId: string,
    deckData: DeckCore,
    changes: {
      created: CardCore[];
      updated: (CardCore & { id: string })[];
      deleted: string[];
    }
  ) => {
    const updateDeckFunction = httpsCallable<
      UpdateDeckRequest,
      UpdateDeckResponse
    >(functions, "updateDeck");
    const result = await updateDeckFunction({
      deckId,
      deckData,
      changes,
    });
    const validatedData = UpdateDeckResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from updateDeck");
    }
    return validatedData.data;
  },

  // Import Anki deck (.apkg file)
  importAnkiDeck: async (storagePath: string, title?: string) => {
    const fn = httpsCallable<ImportAnkiDeckRequest, ImportAnkiDeckResponse>(
      functions,
      "importAnkiDeck"
    );
    const result = await fn({ storagePath, title });
    const validatedData = ImportAnkiDeckResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from importAnkiDeck");
    }
    return validatedData.data;
  },

  // Record a deck view (called when user starts learning)
  recordDeckView: async (deckId: string) => {
    const fn = httpsCallable<RecordDeckViewRequest, RecordDeckViewResponse>(
      functions,
      "recordDeckView"
    );
    const result = await fn({ deckId });
    const validatedData = RecordDeckViewResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from recordDeckView");
    }
    return validatedData.data;
  },

  // Toggle like on a deck
  toggleDeckLike: async (deckId: string) => {
    const fn = httpsCallable<ToggleDeckLikeRequest, ToggleDeckLikeResponse>(
      functions,
      "toggleDeckLike"
    );
    const result = await fn({ deckId });
    const validatedData = ToggleDeckLikeResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from toggleDeckLike");
    }
    return validatedData.data;
  },

  // Check if user has liked a deck
  checkIfLiked: async (deckId: string) => {
    const fn = httpsCallable<CheckIfLikedRequest, CheckIfLikedResponse>(
      functions,
      "checkIfLiked"
    );
    const result = await fn({ deckId });
    const validatedData = CheckIfLikedResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from checkIfLiked");
    }
    return validatedData.data;
  },

  // ============================================================================
  // Avocado Growth Functions
  // ============================================================================

  // Get avocado growth status
  getAvocadoStatus: async () => {
    const fn = httpsCallable<GetAvocadoStatusRequest, GetAvocadoStatusResponse>(
      functions,
      "getAvocadoStatus"
    );
    const result = await fn({});
    const validatedData = GetAvocadoStatusResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getAvocadoStatus");
    }
    return validatedData.data;
  },

  // Harvest avocado (roll gacha for skin)
  harvestAvocado: async () => {
    const fn = httpsCallable<HarvestAvocadoRequest, HarvestAvocadoResponse>(
      functions,
      "harvestAvocado"
    );
    const result = await fn({});
    const validatedData = HarvestAvocadoResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from harvestAvocado");
    }
    return validatedData.data;
  },

  // Get avocado config (skin pool)
  getAvocadoConfig: async () => {
    const fn = httpsCallable<GetAvocadoConfigRequest, GetAvocadoConfigResponse>(
      functions,
      "getAvocadoConfig"
    );
    const result = await fn({});
    const validatedData = GetAvocadoConfigResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getAvocadoConfig");
    }
    return validatedData.data;
  },

  // ============================================================================
  // Quick Add Functions
  // ============================================================================

  // Add a single card to a deck (Quick Add feature)
  addCardToDeck: async (
    deckId: string,
    cardData: { front: string; back?: string },
    source?: "widget" | "ocr" | "deeplink" | "manual"
  ) => {
    const fn = httpsCallable<AddCardToDeckRequest, AddCardToDeckResponse>(
      functions,
      "addCardToDeck"
    );
    const result = await fn({
      deckId,
      cardData: { front: cardData.front, back: cardData.back || "" },
      source,
    });
    const validatedData = AddCardToDeckResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from addCardToDeck");
    }
    return validatedData.data;
  },

  // ============================================================================
  // Translation Functions
  // ============================================================================

  // Translate text using Google Cloud Translation API
  translateText: async (
    text: string,
    fromLanguage: SupportedLanguage,
    toLanguage: SupportedLanguage
  ) => {
    const fn = httpsCallable<TranslateTextRequest, TranslateTextResponse>(
      functions,
      "translateText"
    );
    const result = await fn({ text, fromLanguage, toLanguage });
    const validatedData = TranslateTextResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from translateText");
    }
    return validatedData.data;
  },

  // Get user's translation usage limit status
  getTranslationLimit: async () => {
    const fn = httpsCallable<
      GetTranslationLimitRequest,
      GetTranslationLimitResponse
    >(functions, "getTranslationLimit");
    const result = await fn({});
    const validatedData = GetTranslationLimitResponseSchema.safeParse(
      result.data
    );
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from getTranslationLimit");
    }
    return validatedData.data;
  },

  // ============================================================================
  // OCR Functions
  // ============================================================================

  // Extract text from an image using Gemini Vision
  extractTextFromImage: async (storagePath: string, mimeType: string = "image/jpeg") => {
    const fn = httpsCallable<
      ExtractTextFromImageRequest,
      ExtractTextFromImageResponse
    >(functions, "extractTextFromImage");
    const result = await fn({ storagePath, mimeType });
    const validatedData = ExtractTextFromImageResponseSchema.safeParse(result.data);
    if (!validatedData.success) {
      console.error(validatedData.error);
      throw new Error("Invalid data returned from extractTextFromImage");
    }
    return validatedData.data;
  },

};
