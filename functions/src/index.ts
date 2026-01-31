/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

// Initialize Firebase Admin FIRST before any imports that use Firebase Admin
// This must be synchronous to ensure getFirestore() works in imported modules
initializeApp();

setGlobalOptions({ region: "europe-west1" });

// Import functions that need to be used in triggers (after initialization)
// Import all functions from modules
export { searchDecks } from "./searchFunctions";
export { getSearchLogs } from "./searchFunctions";
export {
  serverNow,
  getCurrentSeason,
  submitPoints,
  weeklyRollOver,
  updateCardProgressAllInOne,
} from "./userFunctions";
export { scanDocument } from "./scanningFunctions";
export {
  getUserDecks,
  updateCardProgress,
  getUserProgress,
  getUserSettings,
  updateUserStreakOnLogin,
  updateUserStreakIfQualified,
  updateUserSettings,
  undoCard,
  getUserProfile,
  getUserActivityHeatmap,
  getUserAwards,
} from "./userFunctions";
export {
  createDeckWithCards,
  updateUserStats,
  syncDeckMetadataToUserCopies,
  getDeckDetails,
  getDeckCards,
  getPopularDecks,
  resetDeck,
  updateDeckSettings,
  updateUserDeckSettings,
  startLearningDeck,
  getUserDeckDetails,
  getUserDeckCards,
  startLearningSession,
  getUserDueDeckCards,
  getDailyUserStats,
  getDeckDailyStats,
  getUserNewDeckCards,
  deleteDeck,
  checkCardChanges,
  syncDeckCards,
  updateCardContent,
  updateDeck,
  importAnkiDeck,
  recordDeckView,
  toggleDeckLike,
  checkIfLiked,
  addCardToDeck,
} from "./deckFunctions";
export {
  getLeaderboard,
  getUserRanking,
  getFollowingRankings,
  assignUserToGroup,
} from "./rankingFunctions";
export {
  getNotifications,
  markNotificationRead,
  createNotification,
  notifyStreakBroken,
  notifySeasonEnd,
  onLeagueAdvance,
} from "./notificationFunctions";
export {
  getLeagueInfo,
  getUserGroup,
  updateUserLeague,
  getAllLeaguesInfo,
} from "./leagueFunctions";
export { addPlaceholderData } from "./placeholderFunctions";
export {
  ensureUserDocument,
  completeOnboarding,
  checkUsernameAvailability,
} from "./authHandlers";
export {
  getAvocadoStatus,
  harvestAvocado,
  getAvocadoConfigFn as getAvocadoConfig,
} from "./avocadoFunctions";
export {
  translateText,
  getTranslationLimit,
} from "./translationFunctions";
export { extractTextFromImage } from "./ocrFunctions";
export { processFile } from "./processFileFunctions";
export {
  avoQuery,
  getAvoQueryLimit,
} from "./avoHelperFunctions";
