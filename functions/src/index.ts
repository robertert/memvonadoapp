/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin FIRST before any imports that use Firebase Admin
initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// Import functions that need to be used in triggers (after initialization)
// Import all functions from modules
export { calculateNextReview } from "./learningFunctions";
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
  updateUserSettings,
  getUserProfile,
  getUserActivityHeatmap,
  getUserAwards,
  getFriendsStreaks,
  processFriendRequest,
  validateUserData,
} from "./userFunctions";
export {
  createDeckWithCards,
  updateUserStats,
  getDeckDetails,
  getDeckCards,
  getDueDeckCards,
  getNewDeckCards,
  getPopularDecks,
  resetDeck,
  updateDeckSettings,
  startLearningDeck,
  getUserDeckDetails,
  getUserDeckCards,
  getUserDueDeckCards,
  getUserNewDeckCards,
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
