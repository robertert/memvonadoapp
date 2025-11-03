/**
 * Tests for leagueFunctions.ts
 */

import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestSeason,
  createSeasonUserPoints,
  createTestGroup,
  waitForFirestore,
} from "./helpers/testHelpers";
import {
  mockUserId,
  mockSeasonId,
  mockGroupId,
  mockLeagueNumber,
} from "./helpers/mockData";

let leagueFunctions: typeof import("../src/leagueFunctions");

describe("League Functions", () => {
  beforeEach(async () => {
    leagueFunctions = await import("../src/leagueFunctions");
  });

  // Note: We don't clear data between tests here to avoid deleting data
  // that subsequent tests may need. Each test should be independent.

  afterAll(() => {
    cleanup();
  });

  describe("getLeagueInfo", () => {
    it("should return league information", async () => {
      const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

      const result = await wrapped({ data: { leagueNumber: 5 } } as any);

      expect(result.league.id).toBe(5);
      expect(result.league.name).toBeDefined();
      expect(result.league.color).toBeDefined();
      expect(result.league.description).toBeDefined();
    });

    it("should throw error when leagueNumber is out of range", async () => {
      const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

      await expect(
        wrapped({ data: { leagueNumber: 0 } } as any)
      ).rejects.toThrow("Valid leagueNumber");

      await expect(
        wrapped({ data: { leagueNumber: 16 } } as any)
      ).rejects.toThrow("Valid leagueNumber");
    });
  });

  describe("getAllLeaguesInfo", () => {
    it("should return all 15 leagues", async () => {
      const wrapped = testEnv.wrap(leagueFunctions.getAllLeaguesInfo);

      const result = await wrapped({ data: {} } as any);

      expect(result.leagues).toHaveLength(15);
      expect(result.leagues[0].id).toBe(1);
      expect(result.leagues[14].id).toBe(15);
    });
  });

  describe("getUserGroup", () => {
    it("should return user's group information", async () => {
      await createTestUser(mockUserId, { league: mockLeagueNumber });
      await createTestSeason(mockSeasonId);
      await createSeasonUserPoints(mockSeasonId, mockUserId, {
        league: mockLeagueNumber,
        groupId: mockGroupId,
      });
      await createTestGroup(mockSeasonId, mockLeagueNumber, mockGroupId, {
        currentCount: 10,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result?.groupId).toBe(mockGroupId);
      expect(result?.leagueNumber).toBe(mockLeagueNumber);
      expect(result?.memberCount).toBe(10);
      expect(result?.capacity).toBe(20);
      expect(result?.isFull).toBe(false);
    });

    it("should return null when user has no group", async () => {
      await createTestUser(mockUserId);
      await createTestSeason(mockSeasonId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect(result).toBeNull();
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });
});
