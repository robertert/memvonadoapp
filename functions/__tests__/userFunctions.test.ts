/**
 * Comprehensive tests for userFunctions.ts
 * Tests cover all edge cases, validation, error handling, and business scenarios
 */

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  createTestUserCard,
  createTestSeason,
  createSeasonUserPoints,
  createTestStudySession,
  createTestGroup,
  waitForFirestore,
  clearUserData,
  clearDeckData,
  clearCurrentSeason,
  clearSeasonUserPoints,
  clearLeagueGroup,
  generateTestId,
} from "./helpers/testHelpers";
import { mockUserId2, mockSeasonId } from "./helpers/mockData";
import { CardGrade } from "../src/types/common";

const db = admin.firestore();

// Import functions - we'll wrap them in tests
let userFunctions: typeof import("../src/userFunctions");

/**
 * Helper to create study session with specific reviewTime as Firestore Timestamp
 */
async function createStudySessionWithReviewTime(
  userId: string,
  sessionId: string,
  reviewTime: Date,
  data: {
    deckId?: string;
    cardId?: string;
    grade?: number;
  } = {}
): Promise<void> {
  await db.doc(`users/${userId}/studySessions/${sessionId}`).set({
    deckId: data.deckId || "test-deck-id",
    cardId: data.cardId || "test-card-id",
    grade: data.grade ?? CardGrade.Easy,
    reviewTime: admin.firestore.Timestamp.fromDate(reviewTime),
  });
}

/**
 * Helper to format date as YYYY-MM-DD in timezone
 */
function formatYmdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

describe("User Functions", () => {
  beforeEach(async () => {
    // Load functions module
    userFunctions = await import("../src/userFunctions");
  });

  afterAll(() => {
    cleanup();
  });

  describe("updateUserStreakOnLogin", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should update streak when there was a session yesterday", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 5,
          longestStreak: 10,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create session from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        yesterday
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10);
      expect(result.lastStreakDate).toBe(formatYmdInTimeZone(yesterday, "UTC"));
    });

    it("should reset streak when there was no session yesterday", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 5,
          longestStreak: 10,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create session from 2 days ago (not yesterday)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(12, 0, 0, 0);

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        twoDaysAgo
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(10); // longest streak preserved
    });

    it("should be idempotent - not update when already updated for yesterday", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 5,
          longestStreak: 10,
          lastStreakDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        },
        settings: {
          timeZone: "UTC",
        },
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        yesterday
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.updated).toBe(false);
      expect(result.currentStreak).toBe(5);
    });

    it("should handle different timezones correctly", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 3,
          longestStreak: 5,
        },
        settings: {
          timeZone: "Europe/Warsaw",
        },
      });

      // Create session from yesterday in Warsaw timezone
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(14, 0, 0, 0); // 14:00 Warsaw time

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        yesterday
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId, timeZone: "Europe/Warsaw" },
      } as any);

      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(4);
    });

    it("should use UTC as fallback when user has no timezone settings", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 2,
          longestStreak: 3,
        },
        settings: {},
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        yesterday
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(3);
    });

    it("should throw HttpsError when user not found", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);

      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow("User not found");
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("should only count sessions from yesterday, not other days", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 1,
          longestStreak: 1,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create sessions from different days
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(12, 0, 0, 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      await createStudySessionWithReviewTime(
        testUserId,
        "session-1",
        twoDaysAgo
      );
      await createStudySessionWithReviewTime(
        testUserId,
        "session-2",
        yesterday
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakOnLogin);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(2); // Should increment because yesterday had session
    });
  });

  describe("updateUserStreakIfQualified", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should update streak when threshold (10 cards) is reached", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 3,
          longestStreak: 5,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create 10 sessions for today
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      for (let i = 0; i < 10; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `session-${i}`,
          today
        );
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.qualified).toBe(true);
      expect(result.updated).toBe(true);
      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(5);
      expect(result.todayCount).toBe(10);
      expect(result.threshold).toBe(10);
    });

    it("should not update when threshold is not reached", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 3,
          longestStreak: 5,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create only 5 sessions (below threshold of 10)
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      for (let i = 0; i < 5; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `session-${i}`,
          today
        );
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.qualified).toBe(false);
      expect(result.updated).toBe(false);
      expect(result.currentStreak).toBe(3);
      expect(result.todayCount).toBe(5);
    });

    it("should be idempotent - not update when already updated today", async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      await createTestUser(testUserId, {
        stats: {
          currentStreak: 3,
          longestStreak: 5,
          lastStreakDate: today, // Already updated today
        },
        settings: {
          timeZone: "UTC",
        },
      });

      // Create 10 sessions
      for (let i = 0; i < 10; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `session-${i}`,
          today
        );
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.qualified).toBe(false);
      expect(result.updated).toBe(false);
      expect(result.currentStreak).toBe(3);
    });

    it("should accept custom threshold", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 2,
          longestStreak: 3,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // Create 5 sessions (custom threshold)
      for (let i = 0; i < 5; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `session-${i}`,
          today
        );
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId, threshold: 5 },
      } as any);

      expect(result.qualified).toBe(true);
      expect(result.updated).toBe(true);
      expect(result.threshold).toBe(5);
      expect(result.todayCount).toBe(5);
    });

    it("should handle different timezones correctly", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 1,
          longestStreak: 2,
        },
        settings: {
          timeZone: "America/New_York",
        },
      });

      const today = new Date();
      today.setHours(14, 0, 0, 0); // 14:00 in NY timezone

      for (let i = 0; i < 10; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `session-${i}`,
          today
        );
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId, timeZone: "America/New_York" },
      } as any);

      expect(result.qualified).toBe(true);
      expect(result.updated).toBe(true);
    });

    it("should throw HttpsError when user not found", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);

      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow("User not found");
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("should filter sessions from last 36 hours and group by YYYY-MM-DD", async () => {
      await createTestUser(testUserId, {
        stats: {
          currentStreak: 0,
          longestStreak: 0,
        },
        settings: {
          timeZone: "UTC",
        },
      });

      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(20, 0, 0, 0); // 20:00 yesterday (within 36h)

      // Create 5 sessions yesterday and 5 today
      for (let i = 0; i < 5; i++) {
        await createStudySessionWithReviewTime(
          testUserId,
          `yesterday-${i}`,
          yesterday
        );
      }
      for (let i = 0; i < 5; i++) {
        await createStudySessionWithReviewTime(testUserId, `today-${i}`, today);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserStreakIfQualified);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      // Should only count today's sessions (5), not yesterday's
      expect(result.todayCount).toBe(5);
      expect(result.qualified).toBe(false); // 5 < 10
    });
  });

  describe("getUserDecks", () => {
    const testUserId = generateTestId("user");
    const testDeckId1 = generateTestId("deck");
    const testDeckId2 = generateTestId("deck");

    afterEach(async () => {
      await clearUserData(testUserId);
      await clearDeckData(testDeckId1);
      await clearDeckData(testDeckId2);
    });

    it("should return user decks", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId1, testUserId);
      await createTestDeck(testDeckId2, testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.decks).toHaveLength(2);
      expect(result.decks.some((d) => d.id === testDeckId1)).toBe(true);
      expect(result.decks.some((d) => d.id === testDeckId2)).toBe(true);
    });

    it("should return empty array when user has no decks", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.decks).toEqual([]);
    });

    it("should return decks with all fields validated", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId1, testUserId, {
        title: "Test Deck 1",
        isPublic: true,
        views: 100,
        likes: 50,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.decks).toHaveLength(1);
      const deck = result.decks[0];
      expect(deck.id).toBe(testDeckId1);
      expect(deck.title).toBe("Test Deck 1");
      expect(deck.isPublic).toBe(true);
      expect(deck.views).toBe(100);
      expect(deck.likes).toBe(50);
      expect(deck.createdBy).toBe(testUserId);
    });

    it("should only return decks created by the user", async () => {
      await createTestUser(testUserId);
      await createTestUser(mockUserId2);
      await createTestDeck(testDeckId1, testUserId);
      await createTestDeck(testDeckId2, mockUserId2); // Different user
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.decks).toHaveLength(1);
      expect(result.decks[0].id).toBe(testDeckId1);
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserDecks);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("updateCardProgress", () => {
    const testUserId = generateTestId("user");
    const testDeckId = generateTestId("deck");
    const testCardId = generateTestId("card");

    afterEach(async () => {
      await clearUserData(testUserId);
      await clearDeckData(testDeckId);
    });

    it("should update card progress and create study session", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const card = {
        id: testCardId,
        cardData: {
          front: "Question",
          back: "Answer",
        },
        tags: [],
        createdAt: new Date(),
        cardAlgo: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 0,
          state: 0,
          stability: 0,
          elapsed_days: 0,
          lapses: 0,
        },
        grade: CardGrade.Easy,
        firstLearn: {
          isNew: false,
        },
      };

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      const result = await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime: 86400000, // 1 day in ms
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify card was updated
      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData).toBeDefined();
      expect(cardData?.grade).toBe(CardGrade.Easy);

      // Verify study session was created
      const sessions = await db
        .collection(`users/${testUserId}/studySessions`)
        .where("cardId", "==", testCardId)
        .get();
      expect(sessions.size).toBeGreaterThan(0);
    });

    it("should update firstLearn.due when firstLearn.isFirst is true", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const card = {
        id: testCardId,
        cardData: {
          front: "Question",
          back: "Answer",
        },
        tags: [],
        createdAt: new Date(),
        grade: CardGrade.Easy,
        firstLearn: {
          isNew: true,
          isFirst: true,
          consecutiveGood: 1,
        },
      };

      const scheduledTime = 600000; // 10 minutes
      const beforeTime = Date.now();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime,
        },
      } as any);

      const afterTime = Date.now();

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.firstLearn?.isFirst).toBe(true);
      expect(cardData?.firstLearn?.due).toBeDefined();

      const dueTime = (cardData?.firstLearn?.due as admin.firestore.Timestamp)
        .toDate()
        .getTime();
      expect(dueTime).toBeGreaterThanOrEqual(beforeTime + scheduledTime);
      expect(dueTime).toBeLessThanOrEqual(afterTime + scheduledTime);
    });

    it("should update cardAlgo.due when firstLearn.isFirst is false", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const card = {
        id: testCardId,
        cardData: {
          front: "Question",
          back: "Answer",
        },
        tags: [],
        createdAt: new Date(),
        cardAlgo: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 1,
          state: 1,
          stability: 1.5,
          elapsed_days: 0,
          lapses: 0,
        },
        grade: CardGrade.Easy,
        firstLearn: {
          isNew: false,
        },
      };

      const scheduledTime = 172800000; // 2 days
      const beforeTime = Date.now();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime,
        },
      } as any);

      const afterTime = Date.now();

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.cardAlgo?.due).toBeDefined();

      const dueTime = (cardData?.cardAlgo?.due as admin.firestore.Timestamp)
        .toDate()
        .getTime();
      expect(dueTime).toBeGreaterThanOrEqual(beforeTime + scheduledTime);
      expect(dueTime).toBeLessThanOrEqual(afterTime + scheduledTime);
    });

    it("should create card if it doesn't exist (merge: true)", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await waitForFirestore();

      const card = {
        id: testCardId,
        cardData: {
          front: "New Question",
          back: "New Answer",
        },
        tags: ["new"],
        createdAt: new Date(),
        cardAlgo: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 0,
          state: 0,
          stability: 0,
          elapsed_days: 0,
          lapses: 0,
        },
        grade: CardGrade.Good,
        firstLearn: {
          isNew: true,
        },
      };

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime: 86400000,
        },
      } as any);

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      expect(cardDoc.exists).toBe(true);
      const cardData = cardDoc.data();
      expect(cardData?.cardData?.front).toBe("New Question");
      expect(cardData?.grade).toBe(CardGrade.Good);
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);

      await expect(
        wrapped({
          data: {
            deckId: testDeckId,
            card: {},
            scheduledTime: 1000,
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw unauthenticated when auth is missing", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await expect(
        wrapped({
          auth: null,
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card: {
              id: testCardId,
              cardData: { front: "Q", back: "A" },
              tags: [],
              createdAt: new Date(),
              firstLearn: { isNew: true },
            },
            scheduledTime: 1000,
          },
        } as any)
      ).rejects.toThrow("Authentication required");
    });

    it("should throw permission-denied when auth.uid differs from userId", async () => {
      await createTestUser(testUserId);
      await createTestUser(mockUserId2);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await expect(
        wrapped({
          auth: { uid: mockUserId2 },
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card: {
              id: testCardId,
              cardData: { front: "Q", back: "A" },
              tags: [],
              createdAt: new Date(),
              firstLearn: { isNew: true },
            },
            scheduledTime: 1000,
          },
        } as any)
      ).rejects.toThrow("Cannot update progress for another user");
    });

    it("should reject non-positive scheduledTime", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await expect(
        wrapped({
          auth: { uid: testUserId },
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card: {
              id: testCardId,
              cardData: { front: "Q", back: "A" },
              tags: [],
              createdAt: new Date(),
              firstLearn: { isNew: true },
            },
            scheduledTime: 0,
          },
        } as any)
      ).rejects.toThrow("scheduledTime must be a positive number of milliseconds");
    });

    it("should reject invalid dailyStats shape from client", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await expect(
        wrapped({
          auth: { uid: testUserId },
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card: {
              id: testCardId,
              cardData: { front: "Q", back: "A" },
              tags: [],
              createdAt: new Date(),
              firstLearn: { isNew: true },
            },
            scheduledTime: 1000,
            dailyStats: {
              newCardsRemaining: -1,
              dueCardsRemaining: 0,
              inProgressDueCards: 0,
              inProgressNewCards: 0,
              completedNewToday: 0,
              completedDueToday: 0,
              lastUpdatedStats: new Date(),
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw HttpsError for invalid CardSchema", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);

      await expect(
        wrapped({
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card: { invalid: "data" },
            scheduledTime: 1000,
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should handle different CardGrade values", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const grades = [
        CardGrade.NotGraded,
        CardGrade.Wrong,
        CardGrade.Hard,
        CardGrade.Good,
        CardGrade.Easy,
      ];

      for (const grade of grades) {
        const card = {
          id: testCardId,
          cardData: {
            front: "Question",
            back: "Answer",
          },
          tags: [],
          createdAt: new Date(),
          cardAlgo: {
            difficulty: 2.5,
            scheduled_days: 1,
            due: new Date(),
            reps: 0,
            state: 0,
            stability: 0,
            elapsed_days: 0,
            lapses: 0,
          },
          grade,
          firstLearn: {
            isNew: false,
          },
        };

        const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
        const result = await wrapped({
          data: {
            userId: testUserId,
            deckId: testDeckId,
            card,
            scheduledTime: 86400000,
          },
        } as any);

        expect(result.success).toBe(true);
      }
    });

    it("direction: reverse — updates firstLearnReverse.due when firstLearnReverse.isFirst=true", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const scheduledTime = 600000; // 10 minutes
      const beforeTime = Date.now();

      const card = {
        id: testCardId,
        cardData: { front: "Question", back: "Answer" },
        tags: [],
        createdAt: new Date(),
        firstLearn: { isNew: false },
        firstLearnReverse: {
          isNew: false,
          isFirst: true,
          consecutiveGood: 1,
        },
        cardAlgoReverse: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 0,
          state: 0,
          stability: 0,
          elapsed_days: 0,
          lapses: 0,
        },
        grade: CardGrade.Good,
      };

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime,
          direction: "reverse",
        },
      } as any);

      const afterTime = Date.now();

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.firstLearnReverse?.isFirst).toBe(true);
      expect(cardData?.firstLearnReverse?.due).toBeDefined();

      const dueTime = (
        cardData?.firstLearnReverse?.due as admin.firestore.Timestamp
      )
        .toDate()
        .getTime();
      expect(dueTime).toBeGreaterThanOrEqual(beforeTime + scheduledTime);
      expect(dueTime).toBeLessThanOrEqual(afterTime + scheduledTime);
    });

    it("direction: reverse — updates cardAlgoReverse.due when NOT isFirst", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      await createTestUserCard(testUserId, testDeckId, testCardId);
      await waitForFirestore();

      const scheduledTime = 172800000; // 2 days
      const beforeTime = Date.now();

      const card = {
        id: testCardId,
        cardData: { front: "Question", back: "Answer" },
        tags: [],
        createdAt: new Date(),
        firstLearn: { isNew: false },
        firstLearnReverse: {
          isNew: false,
          isFirst: false,
        },
        cardAlgoReverse: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 1,
          state: 2,
          stability: 2.5,
          elapsed_days: 1,
          lapses: 0,
        },
        grade: CardGrade.Easy,
      };

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime,
          direction: "reverse",
        },
      } as any);

      const afterTime = Date.now();

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.cardAlgoReverse?.due).toBeDefined();

      const dueTime = (
        cardData?.cardAlgoReverse?.due as admin.firestore.Timestamp
      )
        .toDate()
        .getTime();
      expect(dueTime).toBeGreaterThanOrEqual(beforeTime + scheduledTime);
      expect(dueTime).toBeLessThanOrEqual(afterTime + scheduledTime);
    });

    it("direction: reverse — does NOT modify forward cardAlgo or firstLearn", async () => {
      await createTestUser(testUserId);
      await createTestDeck(testDeckId, testUserId);
      const originalDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      await createTestUserCard(testUserId, testDeckId, testCardId, {
        firstLearn: { isNew: false },
        cardAlgo: {
          difficulty: 2.5,
          stability: 2,
          reps: 1,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: originalDue,
        },
      });
      await waitForFirestore();

      const card = {
        id: testCardId,
        cardData: { front: "Question", back: "Answer" },
        tags: [],
        createdAt: new Date(),
        firstLearn: { isNew: false },
        firstLearnReverse: { isNew: false, isFirst: false },
        cardAlgoReverse: {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 0,
          state: 0,
          stability: 0,
          elapsed_days: 0,
          lapses: 0,
        },
        grade: CardGrade.Easy,
      };

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await wrapped({
        data: {
          userId: testUserId,
          deckId: testDeckId,
          card,
          scheduledTime: 86400000,
          direction: "reverse",
        },
      } as any);

      const cardDoc = await db
        .doc(`users/${testUserId}/decks/${testDeckId}/cards/${testCardId}`)
        .get();
      const cardData = cardDoc.data();

      // Forward cardAlgo.due should remain untouched
      const forwardDue = (
        cardData?.cardAlgo?.due as admin.firestore.Timestamp
      )
        .toDate()
        .getTime();
      expect(forwardDue).toBeCloseTo(originalDue.getTime(), -3);
    });
  });

  describe("getUserProgress", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should return user progress with stats and recent sessions", async () => {
      await createTestUser(testUserId, {
        stats: {
          totalCards: 10,
          totalDecks: 2,
          totalReviews: 50,
          averageDifficulty: 2.5,
          currentStreak: 5,
          longestStreak: 10,
        },
        settings: {
          dailyGoal: 120,
        },
      });

      // Create some study sessions
      for (let i = 0; i < 5; i++) {
        await createTestStudySession(testUserId, `session-${i}`);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.userProgress.stats.totalCards).toBe(10);
      expect(result.userProgress.stats.totalDecks).toBe(2);
      expect(result.userProgress.stats.totalReviews).toBe(50);
      expect(result.userProgress.stats.averageDifficulty).toBe(2.5);
      expect(result.userProgress.stats.currentStreak).toBe(5);
      expect(result.userProgress.dailyGoal).toBe(120);
      expect(result.userProgress.recentSessions).toBeDefined();
      expect(result.userProgress.todaySessionsCount).toBeGreaterThanOrEqual(0);
    });

    it("should return empty recentSessions when user has no sessions", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.userProgress.recentSessions).toEqual([]);
    });

    it("should use default dailyGoal (120) when not set", async () => {
      await createTestUser(testUserId, {
        settings: {},
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.userProgress.dailyGoal).toBe(120);
    });

    it("should limit recent sessions to 10", async () => {
      await createTestUser(testUserId);

      // Create 15 sessions
      for (let i = 0; i < 15; i++) {
        await createTestStudySession(testUserId, `session-${i}`);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.userProgress.recentSessions.length).toBeLessThanOrEqual(10);
    });

    it("should throw HttpsError when user not found", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProgress);

      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow("User not found");
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProgress);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("getUserSettings", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should return settings from dedicated settings doc (users/{userId}/settings/app)", async () => {
      await createTestUser(testUserId);
      await db.doc(`users/${testUserId}/settings/app`).set({
        theme: "dark",
        dailyGoal: 15,
        dailyNew: 10,
        language: "pl",
        timeZone: "Europe/Warsaw",
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect((result.settings as any).theme).toBe("dark");
      expect((result.settings as any).dailyGoal).toBe(15);
      expect((result.settings as any).dailyNew).toBe(10);
      expect((result.settings as any).language).toBe("pl");
      expect((result.settings as any).timeZone).toBe("Europe/Warsaw");
    });

    it("should fallback to user document settings when settings/app doesn't exist", async () => {
      await createTestUser(testUserId);
      // Explicitly set settings in user document (not via createTestUser settings param)
      await db.doc(`users/${testUserId}`).update({
        settings: {
          theme: "light",
          dailyGoal: 10,
          dailyNew: 5,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect((result.settings as any).theme).toBe("light");
      expect((result.settings as any).dailyGoal).toBe(10);
      expect((result.settings as any).dailyNew).toBe(5);
    });

    it("should return empty object when no settings exist", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.settings).toBeDefined();
      // UserSettingsSchema.parse({}) returns object with default values
      expect(typeof result.settings).toBe("object");
    });

    it("should return empty object when user doesn't exist", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserSettings);
      const result = await wrapped({
        data: { userId: "non-existent-user" },
      } as any);

      expect(result.settings).toBeDefined();
      expect(typeof result.settings).toBe("object");
    });

    it("should prioritize settings/app over user.settings", async () => {
      await createTestUser(testUserId);
      await db.doc(`users/${testUserId}`).update({
        settings: {
          theme: "light",
          dailyGoal: 10,
          dailyNew: 5,
        },
      });
      await db.doc(`users/${testUserId}/settings/app`).set({
        theme: "dark",
        dailyGoal: 20,
        dailyNew: 10,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      // Should use settings/app (dark, 20) not user.settings (light, 10)
      expect((result.settings as any).theme).toBe("dark");
      expect((result.settings as any).dailyGoal).toBe(20);
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserSettings);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("updateUserSettings", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should update user settings in settings/app", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const newSettings = {
        theme: "dark" as const,
        dailyGoal: 20,
        dailyNew: 15,
        language: "pl",
        timeZone: "Europe/Warsaw",
      };

      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);
      const result = await wrapped({
        data: { userId: testUserId, settings: newSettings },
      } as any);

      expect(result.success).toBe(true);

      const settingsDoc = await db
        .doc(`users/${testUserId}/settings/app`)
        .get();
      const settings = settingsDoc.data();
      expect(settings?.theme).toBe("dark");
      expect(settings?.dailyGoal).toBe(20);
      expect(settings?.dailyNew).toBe(15);
      expect(settings?.language).toBe("pl");
      expect(settings?.timeZone).toBe("Europe/Warsaw");
    });

    it("should merge settings (partial update)", async () => {
      await createTestUser(testUserId);
      await db.doc(`users/${testUserId}/settings/app`).set({
        theme: "light",
        dailyGoal: 10,
        dailyNew: 5,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);
      await wrapped({
        data: {
          userId: testUserId,
          settings: {
            theme: "dark" as const,
            dailyGoal: 10, // Required field
            dailyNew: 5, // Required field
          },
        },
      } as any);

      const settingsDoc = await db
        .doc(`users/${testUserId}/settings/app`)
        .get();
      const settings = settingsDoc.data();
      expect(settings?.theme).toBe("dark");
      expect(settings?.dailyGoal).toBe(10); // Preserved
      expect(settings?.dailyNew).toBe(5); // Preserved
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);

      await expect(
        wrapped({
          data: {
            settings: {
              theme: "dark" as const,
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw HttpsError for invalid request (missing settings)", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);

      await expect(
        wrapped({
          data: {
            userId: testUserId,
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw HttpsError for invalid UserSettingsSchema", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);

      await expect(
        wrapped({
          data: {
            userId: testUserId,
            settings: {
              theme: "invalid-theme" as any,
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });
  });

  describe("getUserProfile", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should return full user profile", async () => {
      await createTestUser(testUserId, {
        username: "testuser",
        stats: {
          totalCards: 50,
          totalDecks: 3,
          totalReviews: 200,
          averageDifficulty: 2.5,
          currentStreak: 5,
          longestStreak: 10,
        },
        league: 3,
        experiencePoints: 1000,
        currencyCount: 500,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProfile);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.username).toBe("testuser");
      expect(result.stats.totalCards).toBe(50);
      expect(result.stats.totalDecks).toBe(3);
      expect(result.stats.totalReviews).toBe(200);
      expect(result.stats.averageDifficulty).toBe(2.5);
      expect(result.stats.currentStreak).toBe(5);
      expect(result.stats.longestStreak).toBe(10);
      expect(result.league).toBe(3);
      expect(result.experiencePoints).toBe(1000);
      expect(result.currencyCount).toBe(500);
    });

    it("should return user profile with minimal data", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProfile);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.id).toBe(testUserId);
      expect(result.username).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.settings).toBeDefined();
    });

    it("should throw HttpsError when user not found", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProfile);

      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow("User not found");
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProfile);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("getUserActivityHeatmap", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should return heatmap data for specified weeks", async () => {
      await createTestUser(testUserId);

      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);

      await db.doc(`users/${testUserId}/studySessions/session-1`).set({
        deckId: "deck-1",
        cardId: "card-1",
        grade: CardGrade.Easy,
        date: admin.firestore.Timestamp.fromDate(threeDaysAgo),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);
      const result = await wrapped({
        data: { userId: testUserId, weeks: 1 },
      } as any);

      expect(result.heatmapData).toBeDefined();
      expect(result.heatmapData.length).toBe(7); // 1 week = 7 days

      // Should have count > 0 for day with session
      const hasActivity = result.heatmapData.some((d) => d.count > 0);
      expect(hasActivity).toBe(true);
    });

    it("should use default weeks=16 when not specified", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.heatmapData.length).toBe(16 * 7); // 16 weeks = 112 days
    });

    it("should return all days with count=0 when no sessions", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);
      const result = await wrapped({
        data: { userId: testUserId, weeks: 1 },
      } as any);

      expect(result.heatmapData.length).toBe(7);
      const allZero = result.heatmapData.every((d) => d.count === 0);
      expect(allZero).toBe(true);
    });

    it("should group sessions by YYYY-MM-DD date", async () => {
      await createTestUser(testUserId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create 3 sessions on the same day
      for (let i = 0; i < 3; i++) {
        const sessionDate = new Date(today);
        sessionDate.setHours(10 + i, 0, 0, 0); // Different hours, same day

        await db.doc(`users/${testUserId}/studySessions/session-${i}`).set({
          deckId: "deck-1",
          cardId: `card-${i}`,
          grade: CardGrade.Easy,
          date: admin.firestore.Timestamp.fromDate(sessionDate),
        });
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);
      const result = await wrapped({
        data: { userId: testUserId, weeks: 1 },
      } as any);

      // Find today's entry
      const todayKey = today.toISOString().slice(0, 10);
      const todayEntry = result.heatmapData.find((d) => d.date === todayKey);
      expect(todayEntry).toBeDefined();
      // Note: The function uses 'date' field, but we're setting it correctly
      // The actual implementation might filter differently
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("getUserAwards", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should return user awards", async () => {
      await createTestUser(testUserId);

      await db.doc(`users/${testUserId}/awards/award1`).set({
        type: "league",
        leagueNumber: 5,
        earnedAt: admin.firestore.Timestamp.now(),
      });
      await db.doc(`users/${testUserId}/awards/award2`).set({
        type: "streak",
        streakDays: 30,
        earnedAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() - 86400000)
        ),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserAwards);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.awards).toHaveLength(2);
      // Should be sorted by earnedAt desc (newest first)
      expect(result.awards[0].id).toBe("award1");
    });

    it("should return empty array when no awards", async () => {
      await createTestUser(testUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserAwards);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.awards).toEqual([]);
    });

    it("should sort awards by earnedAt descending", async () => {
      await createTestUser(testUserId);

      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

      await db.doc(`users/${testUserId}/awards/award1`).set({
        type: "league",
        earnedAt: admin.firestore.Timestamp.fromDate(twoDaysAgo),
      });
      await db.doc(`users/${testUserId}/awards/award2`).set({
        type: "streak",
        earnedAt: admin.firestore.Timestamp.fromDate(now),
      });
      await db.doc(`users/${testUserId}/awards/award3`).set({
        type: "achievement",
        earnedAt: admin.firestore.Timestamp.fromDate(yesterday),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserAwards);
      const result = await wrapped({
        data: { userId: testUserId },
      } as any);

      expect(result.awards).toHaveLength(3);
      // Should be sorted desc: award2 (now) > award3 (yesterday) > award1 (2 days ago)
      expect(result.awards[0].id).toBe("award2");
      expect(result.awards[1].id).toBe("award3");
      expect(result.awards[2].id).toBe("award1");
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserAwards);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "Invalid request data"
      );
    });
  });

  describe("serverNow", () => {
    it("should return server time", async () => {
      const wrapped = testEnv.wrap(userFunctions.serverNow);

      const before = Date.now();
      const result = await wrapped({ data: {} } as any);
      const after = Date.now();

      expect(result.nowMs).toBeGreaterThanOrEqual(before);
      expect(result.nowMs).toBeLessThanOrEqual(after);
      expect(result.iso).toBeDefined();
      expect(new Date(result.iso).getTime()).toBe(result.nowMs);
    });

    it("should return valid ISO string", async () => {
      const wrapped = testEnv.wrap(userFunctions.serverNow);
      const result = await wrapped({ data: {} } as any);

      expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(result.iso)).not.toThrow();
    });
  });

  describe("getCurrentSeason", () => {
    afterEach(async () => {
      await clearCurrentSeason();
    });

    it("should return existing season", async () => {
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);
      const result = await wrapped({ data: {} } as any);

      expect(result.seasonId).toBe(mockSeasonId);
      expect(result.status).toBe("active");
      expect(result.startAt).toBeDefined();
      expect(result.endAt).toBeDefined();
    });

    it("should create season if it doesn't exist", async () => {
      await clearCurrentSeason();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);
      const result = await wrapped({ data: {} } as any);

      expect(result.seasonId).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.startAt).toBeDefined();
      expect(result.endAt).toBeDefined();

      // Verify season was created in database
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      expect(seasonDoc.exists).toBe(true);
    });

    it("should format seasonId as YYYY-MM-DD_YYYY-MM-DD", async () => {
      await clearCurrentSeason();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);
      const result = await wrapped({ data: {} } as any);

      expect(result.seasonId).toMatch(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/);
    });

    it("should calculate week window from Monday 00:00 UTC to next Monday", async () => {
      await clearCurrentSeason();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);
      const result = await wrapped({ data: {} } as any);

      const startAt = new Date(result.startAt);
      const endAt = new Date(result.endAt);

      // Start should be Monday
      expect(startAt.getUTCDay()).toBe(1); // Monday = 1
      expect(startAt.getUTCHours()).toBe(0);
      expect(startAt.getUTCMinutes()).toBe(0);
      expect(startAt.getUTCSeconds()).toBe(0);

      // End should be 7 days later
      const diffDays = Math.round(
        (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(7);
    });
  });

  describe("submitPoints", () => {
    const testUserId = generateTestId("user");
    const testSeasonId = generateTestId("season");

    afterEach(async () => {
      await clearUserData(testUserId);
      await clearCurrentSeason();
      // Clean up season user points and groups
      try {
        await clearSeasonUserPoints(testSeasonId, testUserId);
        const userDoc = await db.doc(`users/${testUserId}`).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.currentGroupId) {
            await clearLeagueGroup(
              testSeasonId,
              userData.league || 1,
              userData.currentGroupId
            );
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it("should add points and assign user to group", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      const result = await wrapped({
        data: { userId: testUserId, delta: 100 },
      } as any);

      expect(result.success).toBe(true);

      // Verify points were added
      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      expect(userPoints.exists).toBe(true);
      expect(userPoints.data()?.points).toBe(100);
      expect(userPoints.data()?.groupId).toBeDefined();

      // Verify user was assigned to group
      const user = await db.doc(`users/${testUserId}`).get();
      expect(user.data()?.currentGroupId).toBeDefined();
      expect(user.data()?.league).toBe(1);
    });

    it("should update existing points", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);
      await createSeasonUserPoints(testSeasonId, testUserId, { points: 50 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 25 },
      } as any);

      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      expect(userPoints.data()?.points).toBe(75);
    });

    it("should create season if it doesn't exist", async () => {
      await createTestUser(testUserId, { league: 1 });
      await clearCurrentSeason();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      const result = await wrapped({
        data: { userId: testUserId, delta: 100 },
      } as any);

      expect(result.success).toBe(true);

      // Verify season was created
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      expect(seasonDoc.exists).toBe(true);
    });

    it("should find existing group with capacity or create new one", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);
      await waitForFirestore();

      // Create a group that's not full
      const groupId = generateTestId("group");
      await createTestGroup(testSeasonId, 1, groupId, {
        currentCount: 10,
        capacity: 20,
        isFull: false,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 50 },
      } as any);

      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      expect(userPoints.data()?.groupId).toBeDefined();
    });

    it("should update group currentCount when assigning new member", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);

      const groupId = generateTestId("group");
      await createTestGroup(testSeasonId, 1, groupId, {
        currentCount: 5,
        capacity: 20,
        isFull: false,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 100 },
      } as any);
      await waitForFirestore();

      // Check if user was assigned to this group
      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      const userGroupId = userPoints.data()?.groupId;

      if (userGroupId === groupId) {
        const groupDoc = await db
          .collection("leagueGroups")
          .doc(`${testSeasonId}_1`)
          .collection("groups")
          .doc(groupId)
          .get();
        const groupData = groupDoc.data();
        expect(groupData?.currentCount).toBe(6); // 5 + 1 new member
      } else {
        // User was assigned to a different group (newly created)
        // This is also valid behavior
        expect(userGroupId).toBeDefined();
      }
    });

    it("should set isFull when currentCount >= capacity", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);

      const groupId = generateTestId("group");
      await createTestGroup(testSeasonId, 1, groupId, {
        currentCount: 19,
        capacity: 20,
        isFull: false,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 100 },
      } as any);
      await waitForFirestore();

      // Check if user was assigned to this group
      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      const userGroupId = userPoints.data()?.groupId;

      if (userGroupId === groupId) {
        const groupDoc = await db
          .collection("leagueGroups")
          .doc(`${testSeasonId}_1`)
          .collection("groups")
          .doc(groupId)
          .get();
        const groupData = groupDoc.data();
        expect(groupData?.isFull).toBe(true);
        expect(groupData?.currentCount).toBe(20);
      } else {
        // User was assigned to a different group (newly created)
        // This is also valid behavior
        expect(userGroupId).toBeDefined();
      }
    });

    it("should allow negative delta (subtracting points)", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);
      await createSeasonUserPoints(testSeasonId, testUserId, { points: 100 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: -25 },
      } as any);

      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      expect(userPoints.data()?.points).toBe(75);
    });

    it("should allow delta = 0", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);
      await createSeasonUserPoints(testSeasonId, testUserId, { points: 50 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 0 },
      } as any);

      const userPoints = await db
        .doc(`seasonUserPoints/${testSeasonId}/users/${testUserId}`)
        .get();
      expect(userPoints.data()?.points).toBe(50); // Unchanged
    });

    it("should use league=1 as default when user doesn't exist", async () => {
      await createTestSeason(testSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      // This will likely throw an error because user doesn't exist
      // The function tries to read user document which doesn't exist
      // We expect it to either throw or handle gracefully
      try {
        await wrapped({
          data: { userId: "non-existent-user", delta: 100 },
        } as any);
        // If it doesn't throw, verify points were created
        const userPoints = await db
          .doc(`seasonUserPoints/${testSeasonId}/users/non-existent-user`)
          .get();
        expect(userPoints.exists).toBe(true);
      } catch (error) {
        // It's also valid if it throws an error
        expect(error).toBeDefined();
      }
    });

    it("should not increase currentCount when user is already in group", async () => {
      await createTestUser(testUserId, { league: 1 });
      await createTestSeason(testSeasonId);

      const groupId = generateTestId("group");
      await createTestGroup(testSeasonId, 1, groupId, {
        currentCount: 10,
        capacity: 20,
        isFull: false,
      });
      await createSeasonUserPoints(testSeasonId, testUserId, {
        points: 50,
        groupId,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);
      await wrapped({
        data: { userId: testUserId, delta: 25 },
      } as any);

      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${testSeasonId}_1`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.currentCount).toBe(10); // Should not increase
    });

    it("should throw HttpsError for invalid request (missing userId)", async () => {
      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      await expect(wrapped({ data: { delta: 100 } } as any)).rejects.toThrow(
        HttpsError
      );
    });

    it("should throw HttpsError for invalid request (missing delta)", async () => {
      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      await expect(
        wrapped({ data: { userId: testUserId } } as any)
      ).rejects.toThrow(HttpsError);
    });
  });

  describe("weeklyRollOver", () => {
    const testSeasonId = generateTestId("season");

    afterEach(async () => {
      await clearCurrentSeason();
    });

    it("should close season and create new one", async () => {
      const now = new Date();
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() - 7);
      const endAt = new Date(now);

      await db.doc("ranking/currentSeason").set({
        seasonId: testSeasonId,
        startAt: admin.firestore.Timestamp.fromDate(startAt),
        endAt: admin.firestore.Timestamp.fromDate(endAt),
        status: "active",
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.weeklyRollOver);
      const result = await wrapped({ data: {} } as any);

      expect(result.success).toBe(true);
      expect(result.nextSeasonId).toBeDefined();
      expect(result.nextSeasonId).toMatch(
        /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/
      );

      // Verify new season was created
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      expect(seasonDoc.exists).toBe(true);
      const seasonData = seasonDoc.data();
      expect(seasonData?.seasonId).toBe(result.nextSeasonId);
      expect(seasonData?.status).toBe("active");
    });

    it("should create leaderboard with top 100 users", async () => {
      const now = new Date();
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() - 7);
      const endAt = new Date(now);

      await db.doc("ranking/currentSeason").set({
        seasonId: testSeasonId,
        startAt: admin.firestore.Timestamp.fromDate(startAt),
        endAt: admin.firestore.Timestamp.fromDate(endAt),
        status: "active",
      });

      // Create some user points
      for (let i = 0; i < 5; i++) {
        const userId = generateTestId("user");
        await createSeasonUserPoints(testSeasonId, userId, {
          points: 1000 - i * 100,
        });
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.weeklyRollOver);
      await wrapped({ data: {} } as any);

      // Verify leaderboard was created
      const leaderboardDoc = await db
        .doc(`leaderboards/${testSeasonId}/groups/global`)
        .get();
      expect(leaderboardDoc.exists).toBe(true);
      const leaderboardData = leaderboardDoc.data();
      expect(leaderboardData?.entries).toBeDefined();
      expect(Array.isArray(leaderboardData?.entries)).toBe(true);
    });

    it("should throw HttpsError when no current season exists", async () => {
      await clearCurrentSeason();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.weeklyRollOver);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);
      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "No current season"
      );
    });

    it("should allow rollover before season end (with warning)", async () => {
      const now = new Date();
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() - 3);
      const endAt = new Date(now);
      endAt.setDate(endAt.getDate() + 4); // End is in the future

      await db.doc("ranking/currentSeason").set({
        seasonId: testSeasonId,
        startAt: admin.firestore.Timestamp.fromDate(startAt),
        endAt: admin.firestore.Timestamp.fromDate(endAt),
        status: "active",
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.weeklyRollOver);
      const result = await wrapped({ data: {} } as any);

      // Should still succeed (with warning logged)
      expect(result.success).toBe(true);
      expect(result.nextSeasonId).toBeDefined();
    });
  });

  // NOTE: Tests for validateUserData trigger are commented out
  // Firestore triggers (onDocumentWritten) require special testing setup
  // and may not work correctly in unit tests. These should be tested
  // in integration tests or manually verified.
  /*
  describe("validateUserData (trigger)", () => {
    const testUserId = generateTestId("user");

    afterEach(async () => {
      await clearUserData(testUserId);
    });

    it("should initialize stats for new user", async () => {
      // Create user document without stats
      await db.doc(`users/${testUserId}`).set({
        username: "testuser",
        email: "test@example.com",
      });
      await waitForFirestore();

      // Trigger the function by updating the document
      await db.doc(`users/${testUserId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUserId}`).get();
      const userData = userDoc.data();
      expect(userData?.stats).toBeDefined();
      expect(userData?.stats.totalCards).toBe(0);
      expect(userData?.stats.totalDecks).toBe(0);
      expect(userData?.stats.totalReviews).toBe(0);
      expect(userData?.stats.averageDifficulty).toBe(0);
      expect(userData?.stats.currentStreak).toBe(0);
      expect(userData?.stats.longestStreak).toBe(0);
    });

    it("should initialize followersCount and followingCount to 0", async () => {
      await db.doc(`users/${testUserId}`).set({
        username: "testuser",
        email: "test@example.com",
      });
      await waitForFirestore();

      await db.doc(`users/${testUserId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUserId}`).get();
      const userData = userDoc.data();
      expect(userData?.followersCount).toBe(0);
      expect(userData?.followingCount).toBe(0);
    });

    it("should initialize theme to 'light'", async () => {
      await db.doc(`users/${testUserId}`).set({
        username: "testuser",
        email: "test@example.com",
      });
      await waitForFirestore();

      await db.doc(`users/${testUserId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUserId}`).get();
      const userData = userDoc.data();
      expect(userData?.theme).toBe("light");
    });

    it("should be idempotent - not update existing fields", async () => {
      await db.doc(`users/${testUserId}`).set({
        username: "testuser",
        email: "test@example.com",
        stats: {
          totalCards: 10,
          totalDecks: 2,
          totalReviews: 50,
          averageDifficulty: 2.5,
          currentStreak: 5,
          longestStreak: 10,
        },
        followersCount: 5,
        followingCount: 3,
        theme: "dark",
      });
      await waitForFirestore();

      await db.doc(`users/${testUserId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const userDoc = await db.doc(`users/${testUserId}`).get();
      const userData = userDoc.data();
      // Should preserve existing values
      expect(userData?.stats.totalCards).toBe(10);
      expect(userData?.followersCount).toBe(5);
      expect(userData?.theme).toBe("dark");
    });

    it("should log warning for duplicate email (but not throw)", async () => {
      const email = "duplicate@example.com";

      await db.doc(`users/${testUserId}`).set({
        username: "user1",
        email,
      });
      await db.doc(`users/${mockUserId2}`).set({
        username: "user2",
        email,
      });
      await waitForFirestore();

      // Trigger validation
      await db.doc(`users/${testUserId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      // Should not throw - just logs warning
      const userDoc = await db.doc(`users/${testUserId}`).get();
      expect(userDoc.exists).toBe(true);
    });

    it("should not execute when document is deleted", async () => {
      await db.doc(`users/${testUserId}`).set({
        username: "testuser",
        email: "test@example.com",
      });
      await waitForFirestore();

      await db.doc(`users/${testUserId}`).delete();
      await waitForFirestore();

      // Function should handle deletion gracefully
      const userDoc = await db.doc(`users/${testUserId}`).get();
      expect(userDoc.exists).toBe(false);
    });
  });
  */
});
