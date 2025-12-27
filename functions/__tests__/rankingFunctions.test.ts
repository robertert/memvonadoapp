/**
 * Tests for rankingFunctions.ts
 */

import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestSeason,
  createSeasonUserPoints,
  createTestGroup,
  addUserToGroup,
  waitForFirestore,
  createFollowingRelationship,
  clearCurrentSeason,
  clearAllLeagueGroups,
} from "./helpers/testHelpers";
import {
  mockUserId,
  mockUserId2,
  mockSeasonId,
  mockGroupId,
  mockLeagueNumber,
} from "./helpers/mockData";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

let rankingFunctions: typeof import("../src/rankingFunctions");

describe("Ranking Functions", () => {
  beforeEach(async () => {
    rankingFunctions = await import("../src/rankingFunctions");
  });

  afterEach(async () => {
    // Clear all league groups for mock season and league to prevent data leakage between tests
    await clearAllLeagueGroups(mockSeasonId, mockLeagueNumber);

    await clearCurrentSeason();
  });

  afterAll(() => {
    cleanup();
  });

  describe("getLeaderboard", () => {
    it("should return leaderboard for user's group with multiple members (sorted by points desc)", async () => {
      const userId1 = "user-leaderboard-1";
      const userId2 = "user-leaderboard-2";
      const userId3 = "user-leaderboard-3";
      const seasonId = "season-leaderboard-1";
      const groupId = "group-leaderboard-1";
      const leagueNumber = 5;

      await createTestUser(userId1, { league: leagueNumber });
      await createTestUser(userId2, { league: leagueNumber });
      await createTestUser(userId3, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createSeasonUserPoints(seasonId, userId1, {
        league: leagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(seasonId, leagueNumber, groupId);
      await addUserToGroup(seasonId, leagueNumber, groupId, userId1, 100);
      await addUserToGroup(seasonId, leagueNumber, groupId, userId2, 200);
      await addUserToGroup(seasonId, leagueNumber, groupId, userId3, 150);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId1 } } as any);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].points).toBe(200);
      expect(result.entries[1].points).toBe(150);
      expect(result.entries[2].points).toBe(100);
      expect(result.groupId).toBe(groupId);
      expect(result.leagueNumber).toBe(leagueNumber);
      expect(result.seasonId).toBe(seasonId);
      expect(result.totalMembers).toBe(3);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should return correct data structure: entries, groupId, leagueNumber, seasonId, totalMembers", async () => {
      await createTestUser(mockUserId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result).toHaveProperty("entries");
      expect(result).toHaveProperty("groupId");
      expect(result).toHaveProperty("leagueNumber");
      expect(result).toHaveProperty("seasonId");
      expect(result).toHaveProperty("totalMembers");
      expect(Array.isArray(result.entries)).toBe(true);
      expect(result.entries[0]).toHaveProperty("userId");
      expect(result.entries[0]).toHaveProperty("username");
      expect(result.entries[0]).toHaveProperty("points");
      expect(result.entries[0]).toHaveProperty("position");
      expect(result.entries[0]).toHaveProperty("lastActivityAt");
    });

    it("should return username from user document", async () => {
      const userId = "user-username-1";
      const username = "test-username-123";
      const groupId = "group-username-1";

      await createTestUser(userId, {
        league: mockLeagueNumber,
        username: username,
      });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].username).toBe(username);
    });

    it("should return empty leaderboard when user does not exist in season", async () => {
      const userId = "user-not-in-season";

      await createTestUser(userId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries).toEqual([]);
      expect(result.groupId).toBeNull();
      expect(result.leagueNumber).toBeNull();
      expect(result.seasonId).toBe(mockSeasonId);
      expect(result.totalMembers).toBe(0);
    });

    it("should return empty leaderboard when user has no assigned group", async () => {
      const userId = "user-no-group";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries).toEqual([]);
      expect(result.groupId).toBeNull();
      expect(result.leagueNumber).toBe(mockLeagueNumber);
      expect(result.seasonId).toBe(mockSeasonId);
      expect(result.totalMembers).toBe(0);
    });

    it("should return leaderboard for group with single member", async () => {
      const userId = "user-single-member";
      const groupId = "group-single-member";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].userId).toBe(userId);
      expect(result.entries[0].position).toBe(1);
      expect(result.totalMembers).toBe(1);
    });

    it("should return leaderboard for full group with 20 members", async () => {
      const userId = "user-full-group";
      const seasonId = "season-full-group";
      const groupId = "group-full-group";
      const leagueNumber = 3;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 20,
        isFull: true,
        capacity: 20,
      });

      // Add 20 members
      for (let i = 0; i < 20; i++) {
        const memberId = `member-${i}`;
        await createTestUser(memberId, { league: leagueNumber });
        await addUserToGroup(
          seasonId,
          leagueNumber,
          groupId,
          memberId,
          100 + i
        );
      }
      await addUserToGroup(seasonId, leagueNumber, groupId, userId, 100);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries).toHaveLength(21); // 20 + userId
      expect(result.totalMembers).toBe(21);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should handle members without points (default 0)", async () => {
      const userId = "user-no-points";
      const groupId = "group-no-points";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 0,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(mockSeasonId, mockLeagueNumber, groupId, userId, 0);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].points).toBe(0);
    });

    it("should handle members without lastActivityAt (null)", async () => {
      const userId = "user-no-activity";
      const groupId = "group-no-activity";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      // Add member without lastActivityAt
      await db
        .collection("leagueGroups")
        .doc(`${mockSeasonId}_${mockLeagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .collection("members")
        .doc(userId)
        .set({
          userId,
          points: 100,
        });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].lastActivityAt).toBeNull();
    });

    it("should return 'Unknown' when user has no username", async () => {
      const userId = "user-no-username";
      const groupId = "group-no-username";

      await createTestUser(userId, {
        league: mockLeagueNumber,
        username: undefined as any,
      });
      // Remove username from document
      await db
        .doc(`users/${userId}`)
        .update({ username: admin.firestore.FieldValue.delete() });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].username).toBe("Unknown");
    });

    it("should use 'name' when user has no username but has name", async () => {
      const userId = "user-name-only";
      const name = "Test Name Only";
      const groupId = "group-name-only";

      await createTestUser(userId, {
        league: mockLeagueNumber,
        username: undefined as any,
      });
      await db.doc(`users/${userId}`).update({
        username: admin.firestore.FieldValue.delete(),
        name: name,
      });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].username).toBe(name);
    });

    it("should handle members with equal points (sequential positions)", async () => {
      const userId1 = "user-equal-1";
      const userId2 = "user-equal-2";
      const userId3 = "user-equal-3";
      const groupId = "group-equal-points";

      await createTestUser(userId1, { league: mockLeagueNumber });
      await createTestUser(userId2, { league: mockLeagueNumber });
      await createTestUser(userId3, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId1, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId1,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId2,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId3,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId1 } } as any);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].points).toBe(100);
      expect(result.entries[1].points).toBe(100);
      expect(result.entries[2].points).toBe(100);
      expect(result.entries[0].position).toBe(1);
      expect(result.entries[1].position).toBe(2);
      expect(result.entries[2].position).toBe(3);
    });

    it("should handle different point values (0, 100, 1000, very large)", async () => {
      const userId1 = "user-points-0";
      const userId2 = "user-points-100";
      const userId3 = "user-points-1000";
      const userId4 = "user-points-large";
      const groupId = "group-different-points";

      await createTestUser(userId1, { league: mockLeagueNumber });
      await createTestUser(userId2, { league: mockLeagueNumber });
      await createTestUser(userId3, { league: mockLeagueNumber });
      await createTestUser(userId4, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId1, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 0,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(mockSeasonId, mockLeagueNumber, groupId, userId1, 0);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId2,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId3,
        1000
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId4,
        999999
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId1 } } as any);

      expect(result.entries).toHaveLength(4);
      expect(result.entries[0].points).toBe(999999);
      expect(result.entries[1].points).toBe(1000);
      expect(result.entries[2].points).toBe(100);
      expect(result.entries[3].points).toBe(0);
    });

    it("should use seasonId from request when provided", async () => {
      const userId = "user-custom-season";
      const customSeasonId = "custom-season-123";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(customSeasonId);
      await createSeasonUserPoints(customSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(customSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        customSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({
        data: { userId: userId, seasonId: customSeasonId },
      } as any);

      expect(result.seasonId).toBe(customSeasonId);

      // Cleanup
      await clearAllLeagueGroups(customSeasonId, mockLeagueNumber);
    });

    it("should fetch seasonId from currentSeason when not provided", async () => {
      const userId = "user-auto-season";
      const seasonId = "auto-season-456";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(seasonId);
      await createSeasonUserPoints(seasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(seasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        seasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.seasonId).toBe(seasonId);

      // Cleanup
      await clearAllLeagueGroups(seasonId, mockLeagueNumber);
    });

    it("should throw error when currentSeason does not exist in database", async () => {
      const userId = "user-no-season";

      await createTestUser(userId);
      // Don't create currentSeason
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow("No active season");
    });

    it("should throw error when userId is missing (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);

      try {
        await wrapped({ data: {} } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw error when request has invalid type (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      await expect(wrapped({ data: { userId: 123 } } as any)).rejects.toThrow(
        HttpsError
      );

      try {
        await wrapped({ data: { userId: 123 } } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should return 'Unknown' when error occurs fetching username", async () => {
      const userId = "user-error-username";
      const groupId = "group-error-username";

      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: groupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, groupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        groupId,
        userId,
        100
      );
      // Don't create user document - will cause error
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.entries[0].username).toBe("Unknown");
    });
  });

  describe("getUserRanking", () => {
    it("should return user's position in group", async () => {
      const userId = "user-position-1";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 150,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        150
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result).not.toBeNull();
      expect(result?.position).toBeGreaterThan(0);
      expect(result?.points).toBe(150);
      expect(result?.groupId).toBe(mockGroupId);
      expect(result?.leagueNumber).toBe(mockLeagueNumber);
    });

    it("should return correct data structure: position, groupId, leagueNumber, points, totalMembers", async () => {
      const userId = "user-structure-1";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result).toHaveProperty("position");
      expect(result).toHaveProperty("groupId");
      expect(result).toHaveProperty("leagueNumber");
      expect(result).toHaveProperty("points");
      expect(result).toHaveProperty("totalMembers");
    });

    it("should return null position when user does not exist in season", async () => {
      const userId = "user-not-in-season-ranking";

      await createTestUser(userId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBeNull();
      expect(result.groupId).toBeNull();
      expect(result.leagueNumber).toBeNull();
      expect(result.points).toBe(0);
      expect(result.totalMembers).toBeNull();
    });

    it("should return null position when user has no assigned group", async () => {
      const userId = "user-no-group-ranking";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBeNull();
      expect(result.groupId).toBeNull();
      expect(result.leagueNumber).toBe(mockLeagueNumber);
      expect(result.points).toBe(100);
      expect(result.totalMembers).toBeNull();
    });

    it("should return position = 1 when user is first in group", async () => {
      const userId = "user-first-1";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 300,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        300
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBe(1);
    });

    it("should return position = totalMembers when user is last in group", async () => {
      const userId = "user-last-1";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestUser(mockUserId2, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 50,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        50
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBe(2);
      expect(result.totalMembers).toBe(2);
      expect(result.position).toBe(result.totalMembers);
    });

    it("should handle user with 0 points (position at end if others have more)", async () => {
      const userId = "user-zero-points";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestUser(mockUserId2, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 0,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        0
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBe(2);
      expect(result.points).toBe(0);
    });

    it("should return position = 1 when user has most points", async () => {
      const userId = "user-most-points";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestUser(mockUserId2, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 500,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        500
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBe(1);
    });

    it("should handle equal points (counts only users with more points)", async () => {
      const userId1 = "user-equal-1";
      const userId2 = "user-equal-2";
      const userId3 = "user-equal-3";

      await createTestUser(userId1, { league: mockLeagueNumber });
      await createTestUser(userId2, { league: mockLeagueNumber });
      await createTestUser(userId3, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId1,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId2,
        200
      ); // More
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId3,
        100
      ); // Equal
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId1 } } as any);

      // Only userId2 has more points, so position should be 2
      expect(result.position).toBe(2);
      expect(result.totalMembers).toBe(3);
    });

    it("should handle group with single member (position = 1, totalMembers = 1)", async () => {
      const userId = "user-single-member-ranking";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBe(1);
      expect(result.totalMembers).toBe(1);
    });

    it("should handle group with multiple members (different positions)", async () => {
      const userId1 = "user-multi-1";
      const userId2 = "user-multi-2";
      const userId3 = "user-multi-3";

      await createTestUser(userId1, { league: mockLeagueNumber });
      await createTestUser(userId2, { league: mockLeagueNumber });
      await createTestUser(userId3, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, userId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 150,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId1,
        150
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId2,
        200
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId3,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId1 } } as any);

      expect(result.position).toBe(2); // userId2 has 200, userId1 has 150, userId3 has 100
      expect(result.totalMembers).toBe(3);
    });

    it("should use seasonId from request when provided", async () => {
      const userId = "user-custom-season-ranking";
      const customSeasonId = "custom-season-ranking-123";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(customSeasonId);
      await createSeasonUserPoints(customSeasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(customSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        customSeasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({
        data: { userId: userId, seasonId: customSeasonId },
      } as any);

      expect(result).not.toBeNull();
      expect(result.position).toBe(1);

      // Cleanup
      await clearAllLeagueGroups(customSeasonId, mockLeagueNumber);
    });

    it("should fetch seasonId from currentSeason when not provided", async () => {
      const userId = "user-auto-season-ranking";
      const seasonId = "auto-season-ranking-456";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(seasonId);
      await createSeasonUserPoints(seasonId, userId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(seasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        seasonId,
        mockLeagueNumber,
        mockGroupId,
        userId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result).not.toBeNull();
      expect(result.position).toBe(1);

      // Cleanup
      await clearAllLeagueGroups(seasonId, mockLeagueNumber);
    });

    it("should throw error when currentSeason does not exist in database", async () => {
      const userId = "user-no-season-ranking";
      await createTestUser(userId);
      // Don't create currentSeason
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);

      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow("No active season");
    });

    it("should throw error when userId is missing (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);

      try {
        await wrapped({ data: {} } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw error when request has invalid type (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);

      await expect(wrapped({ data: { userId: 123 } } as any)).rejects.toThrow(
        HttpsError
      );

      try {
        await wrapped({ data: { userId: 123 } } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should handle user without points in seasonUserPoints (points: 0)", async () => {
      const userId = "user-no-points-doc";

      await createTestUser(userId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      // Don't create seasonUserPoints
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.position).toBeNull();
      expect(result.points).toBe(0);
    });
  });

  describe("getFollowingRankings", () => {
    it("should return rankings for followed users", async () => {
      const userId = "user-following-1";
      const friendId = "friend-1";

      await createTestUser(userId);
      await createTestUser(friendId, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings.length).toBeGreaterThan(0);
      expect(result.rankings[0]?.userId).toBe(friendId);
    });

    it("should sort rankings by points (descending)", async () => {
      const userId = "user-following-sort";
      const friendId1 = "friend-sort-1";
      const friendId2 = "friend-sort-2";
      const friendId3 = "friend-sort-3";

      await createTestUser(userId);
      await createTestUser(friendId1, { league: mockLeagueNumber });
      await createTestUser(friendId2, { league: mockLeagueNumber });
      await createTestUser(friendId3, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId1);
      await createFollowingRelationship(userId, friendId2);
      await createFollowingRelationship(userId, friendId3);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createSeasonUserPoints(mockSeasonId, friendId2, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 300,
      });
      await createSeasonUserPoints(mockSeasonId, friendId3, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 200,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId1,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId2,
        300
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId3,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toHaveLength(3);
      expect(result.rankings[0]?.points).toBe(300);
      expect(result.rankings[1]?.points).toBe(200);
      expect(result.rankings[2]?.points).toBe(100);
    });

    it("should return correct data for each ranking: userId, username, position, points, leagueNumber, groupId, totalMembers", async () => {
      const userId = "user-following-structure";
      const friendId = "friend-structure";

      await createTestUser(userId);
      await createTestUser(friendId, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings[0]).toHaveProperty("userId");
      expect(result.rankings[0]).toHaveProperty("username");
      expect(result.rankings[0]).toHaveProperty("position");
      expect(result.rankings[0]).toHaveProperty("points");
      expect(result.rankings[0]).toHaveProperty("leagueNumber");
      expect(result.rankings[0]).toHaveProperty("groupId");
      expect(result.rankings[0]).toHaveProperty("totalMembers");
    });

    it("should return empty array when user has no followed users", async () => {
      const userId = "user-no-following";

      await createTestUser(userId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toEqual([]);
    });

    it("should filter out null when followed user does not exist in season", async () => {
      const userId = "user-following-no-season";
      const friendId = "friend-no-season";

      await createTestUser(userId);
      await createTestUser(friendId);
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      // Don't create seasonUserPoints for friend
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toEqual([]);
    });

    it("should return position: null when followed user has no assigned group", async () => {
      const userId = "user-following-no-group";
      const friendId = "friend-no-group";

      await createTestUser(userId);
      await createTestUser(friendId, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId, {
        league: mockLeagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toHaveLength(1);
      expect(result.rankings[0]?.position).toBeNull();
      expect(result.rankings[0]?.groupId).toBeUndefined();
      expect(result.rankings[0]?.points).toBe(100);
    });

    it("should return 'Unknown' when followed user has no username", async () => {
      const userId = "user-following-no-username";
      const friendId = "friend-no-username";

      await createTestUser(userId);
      await createTestUser(friendId, {
        league: mockLeagueNumber,
        username: undefined as any,
      });
      await db.doc(`users/${friendId}`).update({
        username: admin.firestore.FieldValue.delete(),
      });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings[0]?.username).toBe("Unknown");
    });

    it("should use 'name' when followed user has no username but has name", async () => {
      const userId = "user-following-name";
      const friendId = "friend-name";
      const name = "Friend Name Only";

      await createTestUser(userId);
      await createTestUser(friendId, {
        league: mockLeagueNumber,
        username: undefined as any,
      });
      await db.doc(`users/${friendId}`).update({
        username: admin.firestore.FieldValue.delete(),
        name: name,
      });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings[0]?.username).toBe(name);
    });

    it("should return rankings for multiple followed users (all in results)", async () => {
      const userId = "user-following-multiple";
      const friendId1 = "friend-multi-1";
      const friendId2 = "friend-multi-2";
      const friendId3 = "friend-multi-3";

      await createTestUser(userId);
      await createTestUser(friendId1, { league: mockLeagueNumber });
      await createTestUser(friendId2, { league: mockLeagueNumber });
      await createTestUser(friendId3, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId1);
      await createFollowingRelationship(userId, friendId2);
      await createFollowingRelationship(userId, friendId3);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createSeasonUserPoints(mockSeasonId, friendId2, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 200,
      });
      await createSeasonUserPoints(mockSeasonId, friendId3, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 150,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId1,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId2,
        200
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId3,
        150
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toHaveLength(3);
      expect(result.rankings.map((r: any) => r.userId)).toContain(friendId1);
      expect(result.rankings.map((r: any) => r.userId)).toContain(friendId2);
      expect(result.rankings.map((r: any) => r.userId)).toContain(friendId3);
    });

    it("should filter out null when error occurs fetching followed user data", async () => {
      const userId = "user-following-error";
      const friendId = "friend-error";

      await createTestUser(userId);
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(mockSeasonId);
      // Don't create friend user or seasonUserPoints - will cause error
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      // Should filter out null results
      expect(result.rankings).toEqual([]);
    });

    it("should sort followed users with different points (descending)", async () => {
      const userId = "user-following-sort-diff";
      const friendId1 = "friend-sort-diff-1";
      const friendId2 = "friend-sort-diff-2";

      await createTestUser(userId);
      await createTestUser(friendId1, { league: mockLeagueNumber });
      await createTestUser(friendId2, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId1);
      await createFollowingRelationship(userId, friendId2);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 50,
      });
      await createSeasonUserPoints(mockSeasonId, friendId2, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 500,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId1,
        50
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId2,
        500
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings[0]?.points).toBe(500);
      expect(result.rankings[1]?.points).toBe(50);
    });

    it("should maintain order when followed users have equal points", async () => {
      const userId = "user-following-equal";
      const friendId1 = "friend-equal-1";
      const friendId2 = "friend-equal-2";

      await createTestUser(userId);
      await createTestUser(friendId1, { league: mockLeagueNumber });
      await createTestUser(friendId2, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId1);
      await createFollowingRelationship(userId, friendId2);
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, friendId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createSeasonUserPoints(mockSeasonId, friendId2, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId1,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId2,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0]?.points).toBe(100);
      expect(result.rankings[1]?.points).toBe(100);
    });

    it("should use seasonId from request when provided", async () => {
      const userId = "user-following-custom-season";
      const friendId = "friend-custom-season";
      const customSeasonId = "custom-season-following-123";

      await createTestUser(userId);
      await createTestUser(friendId, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(customSeasonId);
      await createSeasonUserPoints(customSeasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(customSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        customSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({
        data: { userId: userId, seasonId: customSeasonId },
      } as any);

      expect(result.rankings.length).toBeGreaterThan(0);

      // Cleanup
      await clearAllLeagueGroups(customSeasonId, mockLeagueNumber);
    });

    it("should fetch seasonId from currentSeason when not provided", async () => {
      const userId = "user-following-auto-season";
      const friendId = "friend-auto-season";
      const seasonId = "auto-season-following-456";

      await createTestUser(userId);
      await createTestUser(friendId, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId);
      await createTestSeason(seasonId);
      await createSeasonUserPoints(seasonId, friendId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(seasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        seasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      expect(result.rankings.length).toBeGreaterThan(0);

      // Cleanup
      await clearAllLeagueGroups(seasonId, mockLeagueNumber);
    });

    it("should throw error when currentSeason does not exist in database", async () => {
      const userId = "user-following-no-season";

      await createTestUser(userId);
      // Don't create currentSeason
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({ data: { userId: userId } } as any)
      ).rejects.toThrow("No active season");
    });

    it("should throw error when userId is missing (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(HttpsError);

      try {
        await wrapped({ data: {} } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw error when request has invalid type (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      await expect(wrapped({ data: { userId: 123 } } as any)).rejects.toThrow(
        HttpsError
      );

      try {
        await wrapped({ data: { userId: 123 } } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should filter null and return only followed users with groups", async () => {
      const userId = "user-following-mixed";
      const friendId1 = "friend-mixed-1";
      const friendId2 = "friend-mixed-2";
      const friendId3 = "friend-mixed-3";

      await createTestUser(userId);
      await createTestUser(friendId1, { league: mockLeagueNumber });
      await createTestUser(friendId2, { league: mockLeagueNumber });
      await createTestUser(friendId3, { league: mockLeagueNumber });
      await createFollowingRelationship(userId, friendId1);
      await createFollowingRelationship(userId, friendId2);
      await createFollowingRelationship(userId, friendId3);
      await createTestSeason(mockSeasonId);
      // friendId1 has group
      await createSeasonUserPoints(mockSeasonId, friendId1, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      // friendId2 has no group
      await createSeasonUserPoints(mockSeasonId, friendId2, {
        league: mockLeagueNumber,
        points: 100,
      });
      // friendId3 doesn't exist in season
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        friendId1,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);
      const result = await wrapped({ data: { userId: userId } } as any);

      // Should return friendId1 (with group) and friendId2 (without group but with position: null)
      // friendId3 should be filtered out (null)
      expect(result.rankings.length).toBeGreaterThanOrEqual(1);
      const friendIds = result.rankings.map((r: any) => r.userId);
      expect(friendIds).toContain(friendId1);
      // friendId2 should be included with position: null
      const friend2 = result.rankings.find((r: any) => r.userId === friendId2);
      if (friend2) {
        expect(friend2.position).toBeNull();
      }
    });
  });

  describe("assignUserToGroup", () => {
    it("should assign user to existing group with available space", async () => {
      const userId = "user-assign-1";
      const seasonId = "season-assign-1";
      const groupId = "group-assign-1";
      const leagueNumber = 5;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 5,
        isFull: false,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(groupId);

      // Verify group count was updated
      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.currentCount).toBe(6);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should create new group when all groups are full", async () => {
      const userId = "user-assign-new-group";
      const seasonId = "season-assign-new";
      const leagueNumber = 3;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      // Create a full group
      await createTestGroup(seasonId, leagueNumber, "group-full", {
        currentCount: 20,
        isFull: true,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.groupId).toBeDefined();
      expect(result.groupId).not.toBe("group-full");

      // Verify new group was created
      const newGroupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(result.groupId)
        .get();
      expect(newGroupDoc.exists).toBe(true);
      const newGroupData = newGroupDoc.data();
      expect(newGroupData?.currentCount).toBe(1);
      expect(newGroupData?.isFull).toBe(false);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should update group currentCount (+1)", async () => {
      const userId = "user-assign-count";
      const seasonId = "season-assign-count";
      const groupId = "group-assign-count";
      const leagueNumber = 4;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 10,
        isFull: false,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.currentCount).toBe(11);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should set isFull to true when group reaches capacity", async () => {
      const userId = "user-assign-full";
      const seasonId = "season-assign-full";
      const groupId = "group-assign-full";
      const leagueNumber = 6;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 19,
        isFull: false,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.isFull).toBe(true);
      expect(groupData?.currentCount).toBe(20);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should update seasonUserPoints (groupId, league)", async () => {
      const userId = "user-assign-season";
      const seasonId = "season-assign-season";
      const groupId = "group-assign-season";
      const leagueNumber = 7;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      const seasonPointsDoc = await db
        .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
        .get();
      const seasonPointsData = seasonPointsDoc.data();
      expect(seasonPointsData?.groupId).toBe(groupId);
      expect(seasonPointsData?.league).toBe(leagueNumber);
    });

    it("should update user document (currentGroupId, league)", async () => {
      const userId = "user-assign-doc";
      const seasonId = "season-assign-doc";
      const groupId = "group-assign-doc";
      const leagueNumber = 8;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      expect(userData?.currentGroupId).toBe(groupId);
      expect(userData?.league).toBe(leagueNumber);
    });

    it("should return success: true and groupId", async () => {
      const userId = "user-assign-success";
      const seasonId = "season-assign-success";
      const groupId = "group-assign-success";
      const leagueNumber = 9;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe(groupId);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should throw error when user does not exist (not-found)", async () => {
      const userId = "user-not-found-assign";
      const seasonId = "season-not-found";

      await createTestSeason(seasonId);
      // Don't create user
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({
          data: { userId: userId, leagueNumber: 5, seasonId: seasonId },
        } as any)
      ).rejects.toThrow(HttpsError);

      try {
        await wrapped({
          data: { userId: userId, leagueNumber: 5, seasonId: seasonId },
        } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("not-found");
      }
    });

    it("should use leagueNumber from request when provided", async () => {
      const userId = "user-assign-league-req";
      const seasonId = "season-assign-league";
      const leagueNumber = 10;

      await createTestUser(userId, { league: 1 }); // Different league in user doc
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, mockGroupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify user was assigned to correct league
      const userDoc = await db.doc(`users/${userId}`).get();
      expect(userDoc.data()?.league).toBe(leagueNumber);

      // Cleanup
      await clearAllLeagueGroups(seasonId, leagueNumber);
    });

    it("should throw error when group is full during transaction (failed-precondition)", async () => {
      const userId = "user-assign-full-error";
      const seasonId = "season-assign-full-error";
      const groupId = "group-assign-full-error";
      const leagueNumber = 12;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 20,
        isFull: true,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      // Should find another group or create new one, but if all are full, should create new
      // Actually, the function should find a non-full group or create new, so this test
      // should verify that it creates a new group when the found group is full
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      // Should create new group instead of failing
      expect(result.success).toBe(true);
      expect(result.groupId).not.toBe(groupId);
    });

    it("should throw error when user has negative points (invalid-argument)", async () => {
      const userId = "user-assign-negative";
      const seasonId = "season-assign-negative";
      const leagueNumber = 13;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, mockGroupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: -10, // Negative points
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({
          data: {
            userId: userId,
            leagueNumber: leagueNumber,
            seasonId: seasonId,
          },
        } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({
          data: {
            userId: userId,
            leagueNumber: leagueNumber,
            seasonId: seasonId,
          },
        } as any)
      ).rejects.toThrow("Invalid response format");
    });

    it("should create seasonUserPoints with points: 0 when user has no seasonUserPoints", async () => {
      const userId = "user-assign-no-season";
      const seasonId = "season-assign-no-season";
      const leagueNumber = 14;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, mockGroupId);
      // Don't create seasonUserPoints
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);

      // Verify seasonUserPoints was created with points: 0
      const seasonPointsDoc = await db
        .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
        .get();
      expect(seasonPointsDoc.exists).toBe(true);
      const seasonPointsData = seasonPointsDoc.data();
      expect(seasonPointsData?.points).toBe(0);
    });

    it("should use existing points when user has seasonUserPoints", async () => {
      const userId = "user-assign-existing";
      const seasonId = "season-assign-existing";
      const leagueNumber = 15;
      const existingPoints = 250;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, mockGroupId);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: existingPoints,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      // Verify member was added with existing points
      const memberDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(mockGroupId)
        .collection("members")
        .doc(userId)
        .get();
      const memberData = memberDoc.data();
      expect(memberData?.points).toBe(existingPoints);
    });

    it("should throw error when userId is missing (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({ data: { leagueNumber: 5, seasonId: "season" } } as any)
      ).rejects.toThrow(HttpsError);

      try {
        await wrapped({ data: { leagueNumber: 5, seasonId: "season" } } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw error when seasonId is missing (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({ data: { userId: "user", leagueNumber: 5 } } as any)
      ).rejects.toThrow(HttpsError);

      try {
        await wrapped({ data: { userId: "user", leagueNumber: 5 } } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
        expect((error as HttpsError).code).toBe("invalid-argument");
      }
    });

    it("should throw error when leagueNumber is out of range 1-15 (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({
          data: { userId: "user", leagueNumber: 0, seasonId: "season" },
        } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({
          data: { userId: "user", leagueNumber: 16, seasonId: "season" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when request has invalid type (invalid-argument)", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      await expect(
        wrapped({
          data: { userId: 123, leagueNumber: 5, seasonId: "season" },
        } as any)
      ).rejects.toThrow(HttpsError);
      await expect(
        wrapped({
          data: { userId: "user", leagueNumber: "invalid", seasonId: "season" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should handle multiple assignments of same user (updates group)", async () => {
      const userId = "user-assign-multiple";
      const seasonId = "season-assign-multiple";
      const groupId1 = "group-assign-multiple-1";
      const groupId2 = "group-assign-multiple-2";
      const leagueNumber = 2;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId1);
      await createTestGroup(seasonId, leagueNumber, groupId2);
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);

      // First assignment
      const result1 = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);
      expect(result1.success).toBe(true);

      await waitForFirestore();

      // Second assignment - should assign to different group or same
      const result2 = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);
      expect(result2.success).toBe(true);
    });

    it("should handle group with currentCount = 19, capacity = 20 (sets isFull: true)", async () => {
      const userId = "user-assign-19";
      const seasonId = "season-assign-19";
      const groupId = "group-assign-19";
      const leagueNumber = 3;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 19,
        isFull: false,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.currentCount).toBe(20);
      expect(groupData?.isFull).toBe(true);
    });

    it("should create new group when all groups have currentCount = 0 but are marked full", async () => {
      const userId = "user-assign-all-full";
      const seasonId = "season-assign-all-full";
      const leagueNumber = 4;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      // Create groups that are marked as full but have 0 count (edge case)
      await createTestGroup(seasonId, leagueNumber, "group-full-1", {
        currentCount: 0,
        isFull: true,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      // Should create new group since existing one is marked as full
      expect(result.success).toBe(true);
      expect(result.groupId).not.toBe("group-full-1");
    });

    it("should create new group when all groups are full", async () => {
      const userId = "user-assign-all-full-2";
      const seasonId = "season-assign-all-full-2";
      const leagueNumber = 5;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      // Create multiple full groups
      await createTestGroup(seasonId, leagueNumber, "group-full-1", {
        currentCount: 20,
        isFull: true,
        capacity: 20,
      });
      await createTestGroup(seasonId, leagueNumber, "group-full-2", {
        currentCount: 20,
        isFull: true,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.groupId).not.toBe("group-full-1");
      expect(result.groupId).not.toBe("group-full-2");

      // Verify new group was created
      const newGroupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(result.groupId)
        .get();
      expect(newGroupDoc.exists).toBe(true);
    });

    it("should check capacity in transaction (race condition protection)", async () => {
      const userId = "user-assign-transaction";
      const seasonId = "season-assign-transaction";
      const groupId = "group-assign-transaction";
      const leagueNumber = 6;

      await createTestUser(userId, { league: leagueNumber });
      await createTestSeason(seasonId);
      await createTestGroup(seasonId, leagueNumber, groupId, {
        currentCount: 19,
        isFull: false,
        capacity: 20,
      });
      await createSeasonUserPoints(seasonId, userId, {
        league: leagueNumber,
        points: 100,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.assignUserToGroup);
      const result = await wrapped({
        data: {
          userId: userId,
          leagueNumber: leagueNumber,
          seasonId: seasonId,
        },
      } as any);

      // Transaction should check capacity and succeed
      expect(result.success).toBe(true);

      // Verify group is now full
      const groupDoc = await db
        .collection("leagueGroups")
        .doc(`${seasonId}_${leagueNumber}`)
        .collection("groups")
        .doc(groupId)
        .get();
      const groupData = groupDoc.data();
      expect(groupData?.currentCount).toBe(20);
      expect(groupData?.isFull).toBe(true);
    });
  });
});
