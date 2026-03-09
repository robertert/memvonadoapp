import * as logger from "firebase-functions/logger";
import { UserSchema, type User } from "../types/common";
import type { UserRepository } from "../repositories/interfaces/UserRepository";

const DEFAULT_SETTINGS = {
  theme: "light" as const,
  notificationsEnabled: true,
  dailyGoal: 120,
  dailyNew: 20,
  language: "en",
  timeZone: "UTC",
};

const DEFAULT_STATS = {
  totalCards: 0,
  totalDecks: 0,
  totalReviews: 0,
  averageDifficulty: 0,
  currentStreak: 0,
  longestStreak: 0,
};

/**
 * Sanitizes a username by removing special characters and ensuring it's at least 3 characters long.
 * @param {string} rawUsername - The raw username to sanitize.
 * @return {string} The sanitized username.
 */
function sanitizeUsername(rawUsername: string): string {
  const sanitized = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (sanitized.length >= 3) {
    return sanitized.slice(0, 32);
  }
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Derives a username from an email address by using the local part of the email address.
 * @param {string} email - The email address to derive a username from.
 * @return {string} The derived username.
 */
function deriveUsernameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "user";
  return sanitizeUsername(localPart);
}

/**
 * Builds a user document from the given parameters.
 * @param {Object} params - The parameters to build the user document from.
 * @param {string} params.uid - The user's ID.
 * @param {string} params.email - The user's email address.
 * @param {string} [params.username] - The user's username.
 * @param {string} [params.language] - The user's language.
 * @return {User} The built user document.
 */
function buildUserDocument(params: {
  uid: string;
  email: string;
  username?: string;
  language?: string;
}): User {
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
    currentGroupId: null,
    experiencePoints: 0,
    currencyCount: 0,
    stats: { ...DEFAULT_STATS },
    followingCount: 0,
    followersCount: 0,
    profileCompleted: false,
    interests: [],
  };

  return UserSchema.parse(user);
}

/**
 * The AuthService class provides methods for managing user authentication and onboarding.
 * @param {UserRepository} userRepo - The user repository to use.
 */
export class AuthService {
  /**
   * Constructs a new AuthService instance.
   * @param {UserRepository} userRepo - The user repository to use.
   */
  constructor(private readonly userRepo: UserRepository) { }

  /**
   * Ensures a user document exists after signup.
   * Idempotent — no-op if the document already exists.
   * @param {Object} params - The parameters to ensure the user document from.
   * @param {string} params.uid - The user's ID.
   * @param {string} params.email - The user's email address.
   * @param {string} [params.displayName] - The user's display name.
   * @return {Promise<{ created: boolean }>} A promise that resolves to an object containing a boolean indicating whether the user document was created.
   */
  async ensureUserDocument(params: {
    uid: string;
    email: string;
    displayName?: string;
  }): Promise<{ created: boolean }> {
    const existing = await this.userRepo.getUser(params.uid);
    if (existing) {
      return { created: false };
    }

    const userDoc = buildUserDocument({
      uid: params.uid,
      email: params.email,
      username: params.displayName,
    });

    await this.userRepo.createUser(params.uid, userDoc);
    logger.info(`AuthService.ensureUserDocument: created user ${params.uid}`);
    return { created: true };
  }

  /**
   * Checks if a username is available.
   * @param {string} username - The username to check availability for.
   * @return {Promise<{ isAvailable: boolean }>} A promise that resolves to an object containing a boolean indicating whether the username is available.
   */
  async checkUsernameAvailability(username: string): Promise<{ isAvailable: boolean }> {
    const normalizedUsername = username.trim().toLowerCase();
    const taken = await this.userRepo.isUsernameTaken(normalizedUsername);
    return { isAvailable: !taken };
  }

  /**
   * Completes onboarding by saving username and interests.
   * Creates user document if it does not exist yet.
   * @param {Object} params - The parameters to complete onboarding from.
   * @param {string} params.uid - The user's ID.
   * @param {string} params.email - The user's email address.
   * @param {string} params.username - The user's username.
   * @param {string[]} params.interests - The user's interests.
   * @return {Promise<void>} A promise that resolves when onboarding is complete.
   */
  async completeOnboarding(params: {
    uid: string;
    email: string;
    username: string;
    interests: string[];
  }): Promise<void> {
    const { uid, email, username, interests } = params;
    const normalizedUsername = username.trim();

    // Check username availability, allowing the current user to keep their own
    const taken = await this.userRepo.isUsernameTaken(normalizedUsername, uid);
    if (taken) {
      throw Object.assign(new Error("Username is already taken"), {
        code: "already-exists" as const,
      });
    }

    const existing = await this.userRepo.getUser(uid);

    if (existing) {
      await this.userRepo.updateUser(uid, {
        username: normalizedUsername,
        interests,
        profileCompleted: true,
        updatedAt: new Date(),
      });
      logger.info(`AuthService.completeOnboarding: updated user ${uid}`);
    } else {
      const userDoc = buildUserDocument({ uid, email, username: normalizedUsername });
      const fullUserDoc = UserSchema.parse({
        ...userDoc,
        interests,
        profileCompleted: true,
        updatedAt: new Date(),
      });
      await this.userRepo.createUser(uid, fullUserDoc);
      logger.info(`AuthService.completeOnboarding: created user ${uid}`);
    }
  }
}
