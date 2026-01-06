/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin FIRST before any imports that use Firebase Admin
// This must be synchronous to ensure getFirestore() works in imported modules
initializeApp();

// Import functions that need to be used in triggers (after initialization)
// Import all functions from modules
export { searchDecks } from "./searchFunctions";
export { getSearchLogs } from "./searchFunctions";
export {
  serverNow,
  getCurrentSeason,
  submitPoints,
  weeklyRollOver,
} from "./userFunctions";
export {
  getUserDecks,
  updateCardProgress,
  getUserProgress,
  getUserSettings,
  updateUserStreakOnLogin,
  updateUserStreakIfQualified,
  updateUserSettings,
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
  getUserDueDeckCards,
  getUserNewDeckCards,
  deleteDeck,
  checkCardChanges,
  syncDeckCards,
  updateCardContent,
  updateDeck,
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
