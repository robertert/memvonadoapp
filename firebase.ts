import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, initializeAuth, Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
} from "firebase/storage";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import Constants from "expo-constants";

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.FIREBASE_MEASUREMENT_ID,
};

let getReactNativePersistenceFn: ((storage: any) => any) | null = null;
try {
  // Try to get RN persistence from main auth export (some versions expose it here)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authMod = require("firebase/auth");
  if (authMod && authMod.getReactNativePersistence) {
    getReactNativePersistenceFn = authMod.getReactNativePersistence as (
      storage: any
    ) => any;
  }
} catch {}

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const analytics: Analytics | undefined =
  Platform.OS === "web" ? getAnalytics(app) : undefined;

// Initialize Auth with proper error handling
let auth: Auth;
try {
  if (getReactNativePersistenceFn) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistenceFn(AsyncStorage),
    });
  } else {
    // Fallback to getAuth if persistence function is not available
    auth = getAuth(app);
  }
} catch (error) {
  console.error("Error initializing auth:", error);
  // Final fallback
  auth = getAuth(app);
}

export { auth };
export const storage: FirebaseStorage = getStorage(app);
export const db: Firestore = getFirestore(app);
export { app };

//connectFirestoreEmulator(getFirestore(), "127.0.0.1", 8080);
//connectStorageEmulator(getStorage(), "127.0.0.1", 9199);
