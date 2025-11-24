import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { UserSchema, type User } from "./types/common";

const REGION = "us-central1";
const db = getFirestore();

/**
 * Domyślne ustawienia użytkownika nadawane przy rejestracji.
 */
const DEFAULT_SETTINGS = {
  theme: "light" as const,
  notificationsEnabled: true,
  dailyGoal: 50,
  dailyNew: 20,
  language: "en",
};

/**
 * Domyślne statystyki użytkownika nadawane przy rejestracji.
 */
const DEFAULT_STATS = {
  totalCards: 0,
  totalDecks: 0,
  totalReviews: 0,
  averageDifficulty: 0,
  currentStreak: 0,
  longestStreak: 0,
};

type UserDocumentParams = {
  uid: string;
  email: string;
  username?: string;
  language?: string;
};

/**
 * Normalizuje nazwę użytkownika tak, aby spełniała wymagania.
 * @param {string} rawUsername - surowa nazwa od klienta
 * @return {string} znormalizowana nazwa
 */
function sanitizeUsername(rawUsername: string): string {
  const sanitized = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (sanitized.length >= 3) {
    return sanitized.slice(0, 32);
  }
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Tworzy nazwę użytkownika na podstawie adresu email.
 * @param {string} email - adres email użytkownika
 * @return {string} nazwa pochodząca z części lokalnej
 */
function deriveUsernameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "user";
  return sanitizeUsername(localPart);
}

/**
 * Buduje kompletny dokument użytkownika zgodny z UserSchema.
 * @param {UserDocumentParams} params - dane wejściowe
 * @return {User} zwalidowany dokument użytkownika
 */
function buildUserDocument(params: UserDocumentParams): User {
  const now = new Date();
  const username =
    params.username && params.username.length >= 3
      ? sanitizeUsername(params.username)
      : deriveUsernameFromEmail(params.email);

  const user = {
    id: params.uid,
    username,
    email: params.email,
    settings: {
      ...DEFAULT_SETTINGS,
      language: params.language || DEFAULT_SETTINGS.language,
    },
    createdAt: now,
    updatedAt: now,
    league: 1,
    currentGroupId: "unassigned",
    experiencePoints: 0,
    currencyCount: 0,
    stats: { ...DEFAULT_STATS },
    followingCount: 0,
    followersCount: 0,
    profileCompleted: false,
  } as User;

  return UserSchema.parse(user);
}

/**
 * Callable Function: tworzy podstawowy dokument użytkownika w Firestore.
 * Wywoływana automatycznie po rejestracji, aby użytkownik miał dokument w bazie
 * nawet jeśli wyjdzie przed ukończeniem onboardingu.
 */
export const ensureUserDocument = onCall(
  { region: REGION },
  async (request: any) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const email = request.auth.token.email || "";
    const displayName = request.auth.token.name || undefined;

    try {
      const userRef = db.doc(`users/${uid}`);
      const snap = await userRef.get();

      if (snap.exists) {
        // Dokument już istnieje
        return { success: true, message: "User document already exists" };
      }

      // Utwórz podstawowy dokument użytkownika
      const userDoc = buildUserDocument({
        uid,
        email,
        username: displayName,
      });

      await userRef.set(userDoc);
      logger.info(
        `ensureUserDocument: Created basic user document for ${uid} (${email})`
      );

      return { success: true, message: "User document created successfully" };
    } catch (error) {
      logger.error(
        `ensureUserDocument: Failed to create user document for ${uid}`,
        error
      );
      throw new HttpsError(
        "internal",
        "Failed to create user document. Please try again."
      );
    }
  }
);

/**
 * Callable Function: zapisuje dane onboardingu użytkownika w Firestore.
 * Wywoływana przez klienta po uzupełnieniu wszystkich danych w onboarding.
 */
export const completeOnboarding = onCall(
  { region: REGION },
  async (request: any) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { username, interests } = request.data || {};

    if (!username || username.trim().length < 3) {
      throw new HttpsError(
        "invalid-argument",
        "Username must be at least 3 characters"
      );
    }

    if (!interests || !Array.isArray(interests) || interests.length < 3) {
      throw new HttpsError(
        "invalid-argument",
        "At least 3 interests are required"
      );
    }

    try {
      const userRef = db.doc(`users/${uid}`);
      const snap = await userRef.get();

      const email = request.auth.token.email || "";
      const sanitizedUsername = sanitizeUsername(username.trim());

      // Sprawdź czy username jest już zajęty
      const usernameQuery = await db
        .collection("users")
        .where("username", "==", sanitizedUsername)
        .get();

      if (!usernameQuery.empty) {
        const existingUser = usernameQuery.docs[0];
        if (existingUser.id !== uid) {
          throw new HttpsError("already-exists", "Username is already taken");
        }
      }

      if (snap.exists) {
        // Aktualizuj istniejący dokument
        await userRef.update({
          username: sanitizedUsername,
          interests: interests,
          profileCompleted: true,
          updatedAt: new Date(),
        });
        logger.info(`completeOnboarding: Updated user document for ${uid}`);
      } else {
        // Utwórz nowy dokument
        const userDoc = buildUserDocument({
          uid,
          email,
          username: sanitizedUsername,
        });

        await userRef.set({
          ...userDoc,
          interests: interests,
          profileCompleted: true,
        });
        logger.info(`completeOnboarding: Created user document for ${uid}`);
      }

      return {
        success: true,
        message: "Onboarding completed successfully",
      };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error(
        `completeOnboarding: Failed to complete onboarding for ${uid}`,
        error
      );
      throw new HttpsError(
        "internal",
        "Failed to complete onboarding. Please try again."
      );
    }
  }
);
