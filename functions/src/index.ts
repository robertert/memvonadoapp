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

// Initialize Firebase Admin
initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

// Import all functions from modules
export { calculateNextReview } from "./learningFunctions";
export { searchDecks } from "./searchFunctions";
export {
  getUserDecks,
  updateCardProgress,
  getUserProgress,
  getUserSettings,
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
} from "./deckFunctions";
