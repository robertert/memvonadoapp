/**
 * Setup file for Cloud Functions tests
 * Configures firebase-functions-test and Firebase Admin
 */

import functionsTest from "firebase-functions-test";
import * as admin from "firebase-admin";

// CRITICAL: Set environment variables for emulator BEFORE initializing Firebase Admin
process.env.GCLOUD_PROJECT = "memvocado-test";
// Use IPv4 instead of IPv6 for emulator connection
// If not set, will use default or production Firestore
if (process.env.FIRESTORE_EMULATOR_HOST) {
  // Replace localhost with 127.0.0.1 to force IPv4
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST.replace("localhost", "127.0.0.1");
} else {
  // Default to emulator if not specified
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

// Initialize Firebase Admin for testing
// Must be done AFTER setting FIRESTORE_EMULATOR_HOST
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "memvocado-test",
  });
}

// Initialize firebase-functions-test
// This must be called AFTER admin is initialized to avoid conflicts
const testEnv = functionsTest({
  projectId: "memvocado-test",
});

// Export test environment and admin
export { testEnv, admin };

// Cleanup function
export const cleanup = () => {
  testEnv.cleanup();
};

// Helper to clear Firestore between tests (for emulator)
export const clearFirestore = async () => {
  // This requires Firestore emulator to be running
  // In production tests, tests should clean up their own data
  // Note: In real implementation, you'd recursively delete collections
  // For now, tests handle their own cleanup
};
