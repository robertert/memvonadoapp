/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
export { searchDecks, getSearchLogs } from "./handlers/searchHandlers";
export { serverNow, getCurrentSeason, submitPoints, weeklyRollOver, updateCardProgressAllInOne, getUserDecks, updateCardProgress, getUserProgress, getUserSettings, updateUserStreakOnLogin, updateUserStreakIfQualified, updateUserSettings, undoCard, getUserProfile, getUserActivityHeatmap, getUserAwards, getPublicUserProfile, toggleFollow, isCurrentUserAdmin, getUserByUsername, } from "./handlers/userHandlers";
export { scanDocument } from "./handlers/fileProcessingHandlers";
export { createDeckWithCards, updateUserStats, syncDeckMetadataToUserCopies, getDeckDetails, getDeckCards, getPopularDecks, resetDeck, updateDeckSettings, updateUserDeckSettings, startLearningDeck, getUserDeckDetails, getUserDeckCards, startLearningSession, getUserDueDeckCards, getDailyUserStats, getDeckDailyStats, getUserNewDeckCards, deleteDeck, checkCardChanges, syncDeckCards, updateCardContent, updateDeck, importAnkiDeck, recordDeckView, toggleDeckLike, checkIfLiked, addCardToDeck, searchUsers, addDeckEditor, removeDeckEditor, getDeckEditors, checkDuplicateCardFront, getSourceDeckCard, startAIOSession, getCardsByIds, } from "./handlers/deckHandlers";
export { getLeaderboard, getUserRanking, getFollowingRankings, assignUserToGroup, } from "./handlers/rankingHandlers";
export { getNotifications, markNotificationRead, createNotification, notifyStreakBroken, notifySeasonEnd, onLeagueAdvance, } from "./handlers/notificationHandlers";
export { getLeagueInfo, getUserGroup, updateUserLeague, getAllLeaguesInfo, } from "./handlers/leagueHandlers";
export { ensureUserDocument, completeOnboarding, checkUsernameAvailability, } from "./handlers/authHandlers";
export { getAvocadoStatus, harvestAvocado, getAvocadoConfig, } from "./handlers/avocadoHandlers";
export { translateText, getTranslationLimit, getTranslationSuggestions, } from "./handlers/translationHandlers";
export { extractTextFromImage, processFile } from "./handlers/fileProcessingHandlers";
export { avoQuery, getAvoQueryLimit, } from "./handlers/avoQueryHandlers";
