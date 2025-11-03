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
} from "./helpers/testHelpers";
import {
  mockUserId,
  mockUserId2,
  mockSeasonId,
  mockGroupId,
  mockLeagueNumber,
} from "./helpers/mockData";

let rankingFunctions: typeof import("../src/rankingFunctions");

describe("Ranking Functions", () => {
  beforeEach(async () => {
    rankingFunctions = await import("../src/rankingFunctions");
  });

  // Note: We don't clear data between tests here to avoid deleting data
  // that subsequent tests may need. Each test should be independent.

  afterAll(() => {
    cleanup();
  });

  describe("getLeaderboard", () => {
    it("should return leaderboard for user's group", async () => {
      await createTestUser(mockUserId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId,
        100
      );
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        200
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].points).toBeGreaterThanOrEqual(
        result.entries[1].points
      );
      expect(result.leagueNumber).toBe(mockLeagueNumber);
    });

    it("should return empty array when user has no group", async () => {
      await createTestUser(mockUserId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.entries).toEqual([]);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getLeaderboard);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("getUserRanking", () => {
    it("should return user's position in group", async () => {
      await createTestUser(mockUserId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 150,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId,
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

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result).not.toBeNull();
      expect(result?.position).toBeGreaterThan(0);
      expect(result?.points).toBe(150);
    });

    it("should return null when user has no group", async () => {
      await createTestUser(mockUserId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result).toBeNull();
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getUserRanking);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });

  describe("getFollowingRankings", () => {
    it("should return rankings for user's friends", async () => {
      await createTestUser(mockUserId, { friends: [mockUserId2] } as any);
      await createTestUser(mockUserId2, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId2, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
        points: 100,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId);
      await addUserToGroup(
        mockSeasonId,
        mockLeagueNumber,
        mockGroupId,
        mockUserId2,
        100
      );
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.rankings.length).toBeGreaterThan(0);
      expect(result.rankings[0].userId).toBe(mockUserId2);
    });

    it("should return empty array when user has no friends", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.rankings).toEqual([]);
    });

    it("should filter out non-existent friends", async () => {
      await createTestUser(mockUserId, {
        friends: [mockUserId2, "non-existent"] as any,
      });
      await createTestUser(mockUserId2);
      await waitForFirestore();

      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result.rankings.length).toBeLessThanOrEqual(1);
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(rankingFunctions.getFollowingRankings);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });
});
