/**
 * Tests for userFunctions.ts
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  createTestCard,
  createTestSeason,
  createSeasonUserPoints,
  createTestStudySession,
  waitForFirestore,
} from "./helpers/testHelpers";
import {
  mockUserId,
  mockUserId2,
  mockDeckId,
  mockCardId,
  mockSeasonId,
} from "./helpers/mockData";

const db = admin.firestore();

// Import functions - we'll wrap them in tests
let userFunctions: typeof import("../src/userFunctions");

describe("User Functions", () => {
  beforeEach(async () => {
    // Load functions module
    userFunctions = await import("../src/userFunctions");
  });

  // Note: We don't clear data between tests here to avoid deleting data
  // that subsequent tests may need. Each test should be independent.

  afterAll(() => {
    cleanup();
  });

  describe("getUserDecks", () => {
    it("should return user decks with cards", async () => {
      await createTestUser(mockUserId);
      await createTestDeck(mockDeckId, mockUserId);
      await createTestCard(mockDeckId, mockCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.decks).toHaveLength(1);
      expect(result.decks[0].id).toBe(mockDeckId);
      expect(result.decks[0].cards).toHaveLength(1);
      expect(result.decks[0].cards[0].id).toBe(mockCardId);
    });

    it("should return empty array when user has no decks", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserDecks);
      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.decks).toEqual([]);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserDecks);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "UserId is required"
      );
    });
  });

  describe("updateCardProgress", () => {
    it("should update card progress and create study session", async () => {
      await createTestUser(mockUserId);
      await createTestDeck(mockDeckId, mockUserId);
      await createTestCard(mockDeckId, mockCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);

      const result = await wrapped({
        data: {
          userId: mockUserId,
          deckId: mockDeckId,
          cardId: mockCardId,
          grade: 3,
          difficulty: 3.0,
          interval: 2,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify card was updated
      const cardDoc = await db
        .doc(`decks/${mockDeckId}/cards/${mockCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.grade).toBe(3);
      expect(cardData?.cardAlgo?.difficulty).toBe(3.0);
      expect(cardData?.cardAlgo?.scheduled_days).toBe(2);

      // Verify study session was created
      const sessions = await db
        .collection(`users/${mockUserId}/studySessions`)
        .where("cardId", "==", mockCardId)
        .get();
      expect(sessions.size).toBeGreaterThan(0);
    });

    it("should update firstLearn when provided", async () => {
      await createTestUser(mockUserId);
      await createTestDeck(mockDeckId, mockUserId);
      await createTestCard(mockDeckId, mockCardId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);

      const firstLearnUpdate = {
        isNew: true,
        due: Date.now() + 600000, // 10 min
        state: 1,
        consecutiveGood: 1,
      };

      await wrapped({
        data: {
          userId: mockUserId,
          deckId: mockDeckId,
          cardId: mockCardId,
          grade: 3,
          firstLearn: firstLearnUpdate,
        },
      } as any);

      const cardDoc = await db
        .doc(`decks/${mockDeckId}/cards/${mockCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.firstLearn?.consecutiveGood).toBe(1);
      expect(cardData?.firstLearn?.state).toBe(1);
    });

    it("should throw error when required parameters are missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateCardProgress);

      await expect(
        wrapped({ data: { userId: mockUserId } } as any)
      ).rejects.toThrow("userId, deckId, and cardId are required");
    });
  });

  describe("getUserProgress", () => {
    it("should return user progress with stats and streak", async () => {
      await createTestUser(mockUserId, {
        stats: {
          totalCards: 10,
          totalDecks: 2,
          totalReviews: 50,
          averageDifficulty: 2.5,
        },
      });
      await createTestStudySession(mockUserId, "session-1");
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.stats.totalCards).toBe(10);
      expect(result.stats.totalDecks).toBe(2);
      expect(result.stats.totalReviews).toBe(50);
      expect(result.recentSessions).toBeDefined();
    });

    it("should calculate streak from recent sessions", async () => {
      await createTestUser(mockUserId);

      // Create sessions from yesterday and today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await createTestStudySession(mockUserId, "session-1", {
        date: yesterday,
      } as any);
      await createTestStudySession(mockUserId, "session-2", {
        date: new Date(),
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProgress);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.streak).toBeGreaterThan(0);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProgress);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "UserId is required"
      );
    });
  });

  describe("getUserSettings", () => {
    it("should return settings from dedicated settings doc", async () => {
      await createTestUser(mockUserId);
      await db.doc(`users/${mockUserId}/settings/app`).set({
        theme: "dark",
        dailyGoal: 15,
        dailyNew: 10,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.settings.theme).toBe("dark");
      expect(result.settings.dailyGoal).toBe(15);
    });

    it("should fallback to user document settings", async () => {
      await createTestUser(mockUserId);
      await db.doc(`users/${mockUserId}`).update({
        settings: {
          theme: "light",
          dailyGoal: 10,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.settings.theme).toBe("light");
      expect(result.settings.dailyGoal).toBe(10);
    });

    it("should return empty object when no settings exist", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserSettings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.settings).toEqual({});
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserSettings);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "UserId is required"
      );
    });
  });

  describe("updateUserSettings", () => {
    it("should update user settings", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);

      const newSettings = {
        theme: "dark" as const,
        dailyGoal: 20,
        dailyNew: 15,
      };

      const result = await wrapped({
        data: { userId: mockUserId, settings: newSettings },
      } as any);

      expect(result.success).toBe(true);

      const settingsDoc = await db
        .doc(`users/${mockUserId}/settings/app`)
        .get();
      const settings = settingsDoc.data();
      expect(settings?.theme).toBe("dark");
      expect(settings?.dailyGoal).toBe(20);
    });

    it("should throw error when userId or settings are missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.updateUserSettings);

      await expect(
        wrapped({ data: { userId: mockUserId } } as any)
      ).rejects.toThrow("userId and settings are required");

      await expect(wrapped({ data: { settings: {} } } as any)).rejects.toThrow(
        "userId and settings are required"
      );
    });
  });

  describe("getUserProfile", () => {
    it("should return full user profile", async () => {
      await createTestUser(mockUserId, {
        username: "testuser",
        friends: [mockUserId2] as any,
        stats: {
          totalCards: 50,
          totalDecks: 3,
          totalReviews: 200,
          averageDifficulty: 2.5,
        },
        streak: 5,
        league: 3,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserProfile);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.username).toBe("testuser");
      expect(result.friendsCount).toBe(1);
      expect(result.followers).toBe(1);
      expect(result.following).toBe(1);
      expect(result.stats.totalCards).toBe(50);
      expect(result.streak).toBe(5);
      expect(result.league).toBe(3);
    });

    it("should throw error when user not found", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProfile);

      await expect(
        wrapped({ data: { userId: "non-existent-user" } } as any)
      ).rejects.toThrow("User not found");
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserProfile);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("getUserActivityHeatmap", () => {
    it("should generate heatmap data from study sessions", async () => {
      await createTestUser(mockUserId);

      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      await createTestStudySession(mockUserId, "session-1", {
        date: threeDaysAgo,
      } as any);
      await createTestStudySession(mockUserId, "session-2", {
        date: today,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);

      const result = await wrapped({
        data: { userId: mockUserId, weeks: 1 },
      } as any);

      expect(result.heatmapData).toBeDefined();
      expect(result.heatmapData.length).toBe(7); // 1 week = 7 days

      // Should have count > 0 for days with sessions
      const hasActivity = result.heatmapData.some((d) => d.count > 0);
      expect(hasActivity).toBe(true);
    });

    it("should return data for all days even without sessions", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);

      const result = await wrapped({
        data: { userId: mockUserId, weeks: 1 },
      } as any);

      expect(result.heatmapData.length).toBe(7);
      // All days should have count 0 when no sessions
      const allZero = result.heatmapData.every((d) => d.count === 0);
      expect(allZero).toBe(true);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserActivityHeatmap);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("getUserAwards", () => {
    it("should return user awards", async () => {
      await createTestUser(mockUserId);

      await db.doc(`users/${mockUserId}/awards/award1`).set({
        type: "league",
        leagueNumber: 5,
        earnedAt: admin.firestore.Timestamp.now(),
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserAwards);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.awards).toHaveLength(1);
      expect((result.awards[0] as any).type).toBe("league");
      expect((result.awards[0] as any).leagueNumber).toBe(5);
    });

    it("should return empty array when no awards", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getUserAwards);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.awards).toEqual([]);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getUserAwards);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("getFriendsStreaks", () => {
    it("should return friends streaks sorted by streak descending", async () => {
      await createTestUser(mockUserId, { friends: [mockUserId2] as any });
      await createTestUser(mockUserId2, {
        streak: 15,
        username: "friend1",
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getFriendsStreaks);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.friendsStreaks).toHaveLength(1);
      expect(result.friendsStreaks[0].streak).toBe(15);
      expect(result.friendsStreaks[0].name).toBe("friend1");
    });

    it("should return empty array when no friends", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getFriendsStreaks);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.friendsStreaks).toEqual([]);
    });

    it("should filter out non-existent friends", async () => {
      await createTestUser(mockUserId, {
        friends: [mockUserId2, "non-existent"],
      } as any);
      await createTestUser(mockUserId2, { streak: 10 } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getFriendsStreaks);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.friendsStreaks).toHaveLength(1);
      expect(result.friendsStreaks[0].userId).toBe(mockUserId2);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.getFriendsStreaks);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("processFriendRequest", () => {
    it("should accept friend request", async () => {
      await createTestUser(mockUserId, {
        pending: [mockUserId2],
      } as any);
      await createTestUser(mockUserId2, {
        incoming: [mockUserId] as any,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.processFriendRequest);

      const result = await wrapped({
        data: {
          fromUserId: mockUserId,
          toUserId: mockUserId2,
          action: "accept",
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify both users have each other in friends
      const user1 = await db.doc(`users/${mockUserId}`).get();
      const user2 = await db.doc(`users/${mockUserId2}`).get();
      expect(user1.data()?.friends).toContain(mockUserId2);
      expect(user2.data()?.friends).toContain(mockUserId);
    });

    it("should reject friend request", async () => {
      await createTestUser(mockUserId, {
        pending: [mockUserId2],
      } as any);
      await createTestUser(mockUserId2, {
        incoming: [mockUserId] as any,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.processFriendRequest);

      const result = await wrapped({
        data: {
          fromUserId: mockUserId,
          toUserId: mockUserId2,
          action: "reject",
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify both users don't have each other in friends
      const user1 = await db.doc(`users/${mockUserId}`).get();
      const user2 = await db.doc(`users/${mockUserId2}`).get();
      expect(user1.data()?.friends).not.toContain(mockUserId2);
      expect(user2.data()?.friends).not.toContain(mockUserId);
    });

    it("should throw error when required parameters are missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.processFriendRequest);

      await expect(
        wrapped({ data: { fromUserId: mockUserId } } as any)
      ).rejects.toThrow("fromUserId, toUserId, and action are required");
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
  });

  describe("getCurrentSeason", () => {
    it("should return current season", async () => {
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);

      const result = await wrapped({ data: {} } as any);

      expect(result.seasonId).toBe(mockSeasonId);
      expect(result.status).toBe("active");
    });

    it("should create season if it doesn't exist", async () => {
      // Ensure no season exists
      await db.doc("ranking/currentSeason").delete();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);

      const result = await wrapped({ data: {} } as any);

      expect(result.seasonId).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.startAt).toBeDefined();
      expect(result.endAt).toBeDefined();
    });

    it("should calculate correct week window (Monday 00:00 UTC to next Monday)", async () => {
      // This test would need to mock the current date
      // For now, we'll just verify structure
      await db.doc("ranking/currentSeason").delete();
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.getCurrentSeason);

      const result = await wrapped({ data: {} } as any);

      // Season ID should be in format YYYY-MM-DD_YYYY-MM-DD
      expect(result.seasonId).toMatch(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("submitPoints", () => {
    it("should add points and assign user to group", async () => {
      await createTestUser(mockUserId, { league: 1 });
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      const result = await wrapped({
        data: { userId: mockUserId, delta: 100 },
      } as any);

      expect(result.success).toBe(true);

      // Verify points were added
      const userPoints = await db
        .doc(`seasonUserPoints/${mockSeasonId}/users/${mockUserId}`)
        .get();
      expect(userPoints.exists).toBe(true);
      expect(userPoints.data()?.points).toBe(100);
      expect(userPoints.data()?.groupId).toBeDefined();

      // Verify user was assigned to group
      const user = await db.doc(`users/${mockUserId}`).get();
      expect(user.data()?.currentGroupId).toBeDefined();
    });

    it("should update existing points", async () => {
      await createTestUser(mockUserId, { league: 1 });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId, { points: 50 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      await wrapped({ data: { userId: mockUserId, delta: 25 } } as any);

      const userPoints = await db
        .doc(`seasonUserPoints/${mockSeasonId}/users/${mockUserId}`)
        .get();
      expect(userPoints.data()?.points).toBe(75);
    });

    it("should throw error when userId or delta is missing", async () => {
      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      await expect(
        wrapped({ data: { userId: mockUserId } } as any)
      ).rejects.toThrow("userId and numeric delta are required");

      await expect(wrapped({ data: { delta: 10 } } as any)).rejects.toThrow(
        "userId and numeric delta are required"
      );
    });

    it("should throw error when delta is not a number", async () => {
      const wrapped = testEnv.wrap(userFunctions.submitPoints);

      await expect(
        wrapped({ data: { userId: mockUserId, delta: "10" } } as any)
      ).rejects.toThrow("userId and numeric delta are required");
    });
  });
});
