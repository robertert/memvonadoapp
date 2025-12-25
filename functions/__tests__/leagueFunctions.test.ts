/**
 * @jest-environment node
 *
 * Comprehensive tests for leagueFunctions.ts
 *
 * Tested functions:
 * - getLeagueInfo
 * - getAllLeaguesInfo
 * - getUserGroup
 * - updateUserLeague
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestSeason,
  createSeasonUserPoints,
  createTestGroup,
  addUserToGroup,
  waitForFirestore,
  generateTestId,
  clearUserData,
  clearSeasonUserPoints,
  clearLeagueGroup,
  clearCurrentSeason,
  createMockCallableRequest,
} from "./helpers/testHelpers";
import { HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

let leagueFunctions: typeof import("../src/leagueFunctions");

describe("League Functions", () => {
  beforeEach(async () => {
    leagueFunctions = await import("../src/leagueFunctions");
  });

  afterAll(() => {
    cleanup();
  });

  describe("getLeagueInfo", () => {
    describe("success cases", () => {
      it("should return league information for league 1", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        const result = await wrapped(
          createMockCallableRequest({
            data: { leagueNumber: 1 },
          })
        );

        expect(result.league.id).toBe(1);
        expect(result.league.name).toBe("Liga 1");
        expect(result.league.color).toBe("#8D8D8D");
        expect(result.league.description).toBe("Startowa liga");
      });

      it("should return league information for league 15", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        const result = await wrapped(
          createMockCallableRequest({
            data: { leagueNumber: 15 },
          })
        );

        expect(result.league.id).toBe(15);
        expect(result.league.name).toBe("Liga 15");
        expect(result.league.color).toBe("#00BFFF");
        expect(result.league.description).toBe("Diamentowa Liga");
      });

      it("should return league information for all leagues 1-15", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        for (let i = 1; i <= 15; i++) {
          const result = await wrapped(
            createMockCallableRequest({
              data: { leagueNumber: i },
            })
          );

          expect(result.league.id).toBe(i);
          expect(result.league.name).toBeDefined();
          expect(result.league.color).toBeDefined();
          expect(result.league.description).toBeDefined();
        }
      });
    });

    describe("validation errors", () => {
      it("should throw error when leagueNumber is 0", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 0 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when leagueNumber is negative", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: -1 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when leagueNumber is greater than 15", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 16 },
            })
          )
        ).rejects.toThrow(HttpsError);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 100 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when leagueNumber is not an integer", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 5.5 },
            })
          )
        ).rejects.toThrow(HttpsError);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 1.1 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when leagueNumber is missing", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: {},
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when leagueNumber is string", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: "5" },
            } as any)
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when request has additional fields", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { leagueNumber: 5, extraField: "test" },
            } as any)
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when request data is null", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getLeagueInfo);

        await expect(
          wrapped(createMockCallableRequest({ data: null } as any))
        ).rejects.toThrow(HttpsError);
      });
    });
  });

  describe("getAllLeaguesInfo", () => {
    describe("success cases", () => {
      it("should return all 15 leagues", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getAllLeaguesInfo);

        const result = await wrapped(createMockCallableRequest({}));

        expect(result.leagues).toHaveLength(15);
        expect(result.leagues[0].id).toBe(1);
        expect(result.leagues[14].id).toBe(15);
      });

      it("should return leagues with correct structure", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getAllLeaguesInfo);

        const result = await wrapped(createMockCallableRequest({}));

        result.leagues.forEach((league) => {
          expect(league.id).toBeGreaterThanOrEqual(1);
          expect(league.id).toBeLessThanOrEqual(15);
          expect(typeof league.name).toBe("string");
          expect(typeof league.color).toBe("string");
          expect(typeof league.description).toBe("string");
        });
      });

      it("should work with empty request data", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getAllLeaguesInfo);

        const result = await wrapped(createMockCallableRequest({ data: {} }));

        expect(result.leagues).toHaveLength(15);
      });
    });
  });

  describe("getUserGroup", () => {
    beforeEach(async () => {
      // Clean up currentSeason before each test to ensure isolation
      await clearCurrentSeason();
    });

    describe("success cases", () => {
      it("should return user's group information when user has a group", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const groupId = generateTestId("group");
        const leagueNumber = 5;

        await createTestUser(userId, { league: leagueNumber });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: leagueNumber,
          groupId: groupId,
        });
        await createTestGroup(seasonId, leagueNumber, groupId, {
          currentCount: 10,
          capacity: 20,
          isFull: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, seasonId },
          })
        );

        expect(result.groupId).toBe(groupId);
        expect(result.leagueNumber).toBe(leagueNumber);
        expect(result.memberCount).toBe(10);
        expect(result.capacity).toBe(20);
        expect(result.isFull).toBe(false);

        // Cleanup
        await clearLeagueGroup(seasonId, leagueNumber, groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should return null groupId and leagueNumber when user has no group", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");

        await createTestUser(userId);
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 1,
          groupId: undefined,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, seasonId },
          })
        );

        expect(result.groupId).toBeNull();
        expect(result.leagueNumber).toBeNull();
        expect(result.memberCount).toBe(0);
        expect(result.capacity).toBe(20);
        expect(result.isFull).toBe(false);

        // Cleanup
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should return null when user does not exist in seasonUserPoints", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");

        await createTestUser(userId);
        await createTestSeason(seasonId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, seasonId },
          })
        );

        expect(result.groupId).toBeNull();
        expect(result.leagueNumber).toBeNull();
        expect(result.memberCount).toBe(0);
        expect(result.capacity).toBe(20);
        expect(result.isFull).toBe(false);

        // Cleanup
        await clearUserData(userId);
      });

      it("should throw error when groupId exists but group does not exist (data inconsistency)", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const nonExistentGroupId = generateTestId("group");

        await createTestUser(userId);
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 5,
          groupId: nonExistentGroupId,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        // This should throw an error because it's a data inconsistency
        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, seasonId },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should automatically get seasonId from currentSeason when not provided", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const groupId = generateTestId("group");
        const leagueNumber = 3;

        await createTestUser(userId, { league: leagueNumber });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: leagueNumber,
          groupId: groupId,
        });
        await createTestGroup(seasonId, leagueNumber, groupId, {
          currentCount: 5,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId },
          })
        );

        expect(result.groupId).toBe(groupId);
        expect(result.leagueNumber).toBe(leagueNumber);

        // Cleanup
        await clearLeagueGroup(seasonId, leagueNumber, groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });
    });

    describe("authorization errors", () => {
      it("should throw error when user is not authenticated", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: null,
              data: { userId: "test-user" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when auth.uid is missing", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: {} as any,
              data: { userId: "test-user" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: {},
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is empty string", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId: "" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when request has additional fields", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, extraField: "test" },
            } as any)
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should throw error when currentSeason does not exist", async () => {
        const userId = generateTestId("user");

        await createTestUser(userId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await clearUserData(userId);
      });

      it("should throw error when season exists but has no id", async () => {
        const userId = generateTestId("user");

        await createTestUser(userId);
        // Create season without id field
        await db.doc("ranking/currentSeason").set({
          startAt: admin.firestore.Timestamp.now(),
          endAt: admin.firestore.Timestamp.now(),
          status: "active",
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await db.doc("ranking/currentSeason").delete();
        await clearUserData(userId);
      });

      it("should throw error when group data is corrupted (invalid schema)", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const groupId = generateTestId("group");

        await createTestUser(userId);
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 5,
          groupId: groupId,
        });
        // Create group with invalid data (missing required fields)
        await db
          .collection("leagueGroups")
          .doc(`${seasonId}_5`)
          .collection("groups")
          .doc(groupId)
          .set({
            // Missing required fields like capacity, currentCount, etc.
            invalidField: "test",
          });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.getUserGroup);

        // Should throw internal error when group data fails validation
        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, seasonId },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await db
          .collection("leagueGroups")
          .doc(`${seasonId}_5`)
          .collection("groups")
          .doc(groupId)
          .delete();
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });
    });
  });

  describe("updateUserLeague", () => {
    beforeEach(async () => {
      // Clean up currentSeason before each test to ensure isolation
      await clearCurrentSeason();
    });

    describe("success cases", () => {
      it("should update user to different league and assign to new group", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const oldGroupId = generateTestId("oldGroup");
        const oldLeague = 1;
        const newLeague = 5;

        await createTestUser(userId, { league: oldLeague });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: oldLeague,
          groupId: oldGroupId,
          points: 100,
        });
        await createTestGroup(seasonId, oldLeague, oldGroupId, {
          currentCount: 5,
          isFull: false,
        });
        await addUserToGroup(seasonId, oldLeague, oldGroupId, userId, 100);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect(result.league).toBe(newLeague);
        expect((result as any).groupId).toBeDefined();

        // Verify user was removed from old group
        const oldGroupDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${oldLeague}`)
          .collection("groups")
          .doc(oldGroupId)
          .get();
        const oldGroupData = oldGroupDoc.data();
        expect(oldGroupData?.currentCount).toBe(4); // Decremented
        expect(oldGroupData?.isFull).toBe(false);

        const oldMemberDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${oldLeague}`)
          .collection("groups")
          .doc(oldGroupId)
          .collection("members")
          .doc(userId)
          .get();
        expect(oldMemberDoc.exists).toBe(false);

        // Verify user was added to new group
        const userDoc = await db.doc(`users/${userId}`).get();
        const userData = userDoc.data();
        expect(userData?.league).toBe(newLeague);
        expect(userData?.currentGroupId).toBe((result as any).groupId);

        const seasonPointsDoc = await db
          .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
          .get();
        const seasonPointsData = seasonPointsDoc.data();
        expect(seasonPointsData?.league).toBe(newLeague);
        expect(seasonPointsData?.groupId).toBe((result as any).groupId);
        expect(seasonPointsData?.points).toBe(100); // Points preserved

        // Cleanup
        await clearLeagueGroup(seasonId, oldLeague, oldGroupId);
        const newGroupId = (result as any).groupId;
        await clearLeagueGroup(seasonId, newLeague, newGroupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should return early when updating to same league", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const league = 5;

        await createTestUser(userId, { league });
        await createTestSeason(seasonId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague: league, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect(result.league).toBe(league);
        expect((result as any).groupId).toBeUndefined();

        // Cleanup
        await clearUserData(userId);
      });

      it("should assign user to existing group with available capacity", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const existingGroupId = generateTestId("group");
        const newLeague = 3;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await createTestGroup(seasonId, newLeague, existingGroupId, {
          currentCount: 10,
          capacity: 20,
          isFull: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect((result as any).groupId).toBe(existingGroupId);

        // Verify group count was incremented
        const groupDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${newLeague}`)
          .collection("groups")
          .doc(existingGroupId)
          .get();
        const groupData = groupDoc.data();
        expect(groupData?.currentCount).toBe(11);

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, existingGroupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should create new group when all existing groups are full", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const newLeague = 4;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        // Create a full group
        const fullGroupId = generateTestId("fullGroup");
        await createTestGroup(seasonId, newLeague, fullGroupId, {
          currentCount: 20,
          capacity: 20,
          isFull: true,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect((result as any).groupId).toBeDefined();
        expect((result as any).groupId).not.toBe(fullGroupId); // New group created

        // Verify new group was created
        const newGroupDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${newLeague}`)
          .collection("groups")
          .doc((result as any).groupId)
          .get();
        expect(newGroupDoc.exists).toBe(true);
        const newGroupData = newGroupDoc.data();
        expect(newGroupData?.currentCount).toBe(1);
        expect(newGroupData?.isFull).toBe(false);

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, fullGroupId);
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should handle user without old group", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const newLeague = 2;

        await createTestUser(userId, { league: 1, currentGroupId: undefined });
        await createTestSeason(seasonId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect((result as any).groupId).toBeDefined();

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should handle user with groupId but old group does not exist", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const nonExistentGroupId = generateTestId("oldGroup");
        const newLeague = 6;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 1,
          groupId: nonExistentGroupId,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect((result as any).groupId).toBeDefined();

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should automatically get seasonId from currentSeason when not provided", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const newLeague = 7;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague },
          })
        );

        expect(result.success).toBe(true);
        expect(result.league).toBe(newLeague);

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should update isFull to true when group reaches capacity", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const groupId = generateTestId("group");
        const newLeague = 8;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await createTestGroup(seasonId, newLeague, groupId, {
          currentCount: 19,
          capacity: 20,
          isFull: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect((result as any).groupId).toBe(groupId);

        // Verify group is now full
        const groupDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${newLeague}`)
          .collection("groups")
          .doc(groupId)
          .get();
        const groupData = groupDoc.data();
        expect(groupData?.currentCount).toBe(20);
        expect(groupData?.isFull).toBe(true);

        // Cleanup
        await clearLeagueGroup(seasonId, newLeague, groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should preserve user points when changing leagues", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const oldGroupId = generateTestId("oldGroup");
        const newLeague = 9;
        const userPoints = 250;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 1,
          groupId: oldGroupId,
          points: userPoints,
        });
        await createTestGroup(seasonId, 1, oldGroupId, {
          currentCount: 1,
        });
        await addUserToGroup(seasonId, 1, oldGroupId, userId, userPoints);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);
        expect((result as any).groupId).toBeDefined();

        // Verify points are preserved in seasonUserPoints
        const seasonPointsDoc = await db
          .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
          .get();
        const seasonPointsData = seasonPointsDoc.data();
        expect(seasonPointsData?.points).toBe(userPoints);

        // Verify member in new group has same points
        const memberDoc = await db
          .collection("leagueGroups")
          .doc(`${seasonId}_${newLeague}`)
          .collection("groups")
          .doc((result as any).groupId)
          .collection("members")
          .doc(userId)
          .get();
        expect(memberDoc.exists).toBe(true);
        const memberData = memberDoc.data();
        expect(memberData?.points).toBe(userPoints);

        // Cleanup
        await clearLeagueGroup(seasonId, 1, oldGroupId);
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });
    });

    describe("authorization errors", () => {
      it("should throw error when user is not authenticated", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: null,
              data: { userId: "test-user", newLeague: 5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when auth.uid is missing", async () => {
        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: {} as any,
              data: { userId: "test-user", newLeague: 5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("validation errors", () => {
      it("should throw error when userId is missing", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { newLeague: 5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when newLeague is missing", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when newLeague is less than 1", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 0 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when newLeague is greater than 15", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 16 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when newLeague is not an integer", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 5.5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when request has additional fields", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 5, extraField: "test" },
            } as any)
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("edge cases", () => {
      it("should throw error when user does not exist", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");

        await createTestSeason(seasonId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 5, seasonId },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when currentSeason does not exist", async () => {
        const userId = generateTestId("user");

        await createTestUser(userId);
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 5 },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await clearUserData(userId);
      });

      it("should throw error when season exists but has no id", async () => {
        const userId = generateTestId("user");

        await createTestUser(userId);
        // Create season without id field
        await db.doc("ranking/currentSeason").set({
          startAt: admin.firestore.Timestamp.now(),
          endAt: admin.firestore.Timestamp.now(),
          status: "active",
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague: 5 },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await db.doc("ranking/currentSeason").delete();
        await clearUserData(userId);
      });

      it("should handle old group with null/undefined currentCount", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const oldGroupId = generateTestId("oldGroup");
        const newLeague = 10;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        await createSeasonUserPoints(seasonId, userId, {
          league: 1,
          groupId: oldGroupId,
        });
        // Create group with missing currentCount
        await db
          .collection("leagueGroups")
          .doc(`${seasonId}_1`)
          .collection("groups")
          .doc(oldGroupId)
          .set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isFull: false,
            capacity: 20,
            leagueNumber: 1,
            // currentCount is missing
          });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        const result = await wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: { userId, newLeague, seasonId },
          })
        );

        expect(result.success).toBe(true);

        // Cleanup
        await db
          .collection("leagueGroups")
          .doc(`${seasonId}_1`)
          .collection("groups")
          .doc(oldGroupId)
          .delete();
        await clearLeagueGroup(seasonId, newLeague, (result as any).groupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });

      it("should throw error when user has negative points", async () => {
        const userId = generateTestId("user");
        const seasonId = generateTestId("season");
        const oldGroupId = generateTestId("oldGroup");
        const newLeague = 12;

        await createTestUser(userId, { league: 1 });
        await createTestSeason(seasonId);
        // Create seasonUserPoints with negative points (shouldn't happen but test edge case)
        await db.doc(`seasonUserPoints/${seasonId}/users/${userId}`).set({
          points: -10, // Invalid negative points
          league: 1,
          groupId: oldGroupId,
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await createTestGroup(seasonId, 1, oldGroupId, {
          currentCount: 1,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(leagueFunctions.updateUserLeague);

        // Should throw error when trying to add member with negative points
        await expect(
          wrapped(
            createMockCallableRequest({
              auth: { uid: userId },
              data: { userId, newLeague, seasonId },
            })
          )
        ).rejects.toThrow(HttpsError);

        // Cleanup
        await clearLeagueGroup(seasonId, 1, oldGroupId);
        await clearSeasonUserPoints(seasonId, userId);
        await clearUserData(userId);
      });
    });
  });
});
