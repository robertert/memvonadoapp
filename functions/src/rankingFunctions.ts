import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  LeagueGroupSchema,
  SeasonUserPointsSchema,
  UserSchema,
  type LeagueGroup,
  FollowingArraySchema,
} from "./types/common";
import { serializeTimestamps } from "./utils/serialization";
import { z } from "zod";
import {
  GetLeaderboardRequestSchema,
  GetUserRankingRequestSchema,
  GetFollowingRankingsRequestSchema,
  AssignUserToGroupRequestSchema,
  GetLeaderboardResponseSchema,
  GetUserRankingResponseSchema,
  GetFollowingRankingsResponseSchema,
  AssignUserToGroupResponseSchema,
  GetCurrentSeasonResponseSchema,
  Following,
} from "memvocado-types";

const db = getFirestore();

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Whitelist schematy dla aktualizacji (set/update) w ranking functions.
 */
const UserLeagueAssignUpdateSchema = z
  .object({
    currentGroupId: z.string().nullable().optional(),
    league: z.number().optional(),
  })
  .partial();

const SeasonUserPointsAssignUpdateSchema = z
  .object({
    league: z.number().optional(),
    groupId: z.string().nullable().optional(),
    points: z.number().optional(),
  })
  .partial();

const LeagueGroupUpdateSchema = LeagueGroupSchema.pick({
  currentCount: true,
  isFull: true,
}).partial();

/**
 * Helper function to get current season ID with validation.
 * If seasonId is provided, returns it. Otherwise, fetches and validates from ranking/currentSeason.
 * Logic-Critical Data (PARSE IT): seasonId is used in conditions and queries.
 * @param {string} [seasonId] - Optional season ID. If not provided, fetches from database.
 * @return {Promise<string>} Validated season ID
 */
async function getCurrentSeasonId(seasonId?: string): Promise<string> {
  if (seasonId) {
    return seasonId;
  }

  const seasonDoc = await db.doc("ranking/currentSeason").get();
  if (!seasonDoc.exists) {
    throw new HttpsError("failed-precondition", "No active season");
  }

  const seasonData = seasonDoc.data();
  const validatedSeason = GetCurrentSeasonResponseSchema.pick({
    seasonId: true,
  }).parse(seasonData);

  if (!validatedSeason.seasonId) {
    throw new HttpsError("failed-precondition", "No active season");
  }

  return validatedSeason.seasonId;
}

/**
 * Get leaderboard for user's group (20-person league group)
 * Returns the ranking of all members in the user's current league group
 */
export const getLeaderboard = onCall(async (request) => {
  const parsed = GetLeaderboardRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, seasonId } = parsed.data;

  try {
    // Logic-Critical Data (PARSE IT): seasonId is used in conditions and queries
    const currentSeasonId = await getCurrentSeasonId(seasonId);

    // Get user's league and group info
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();

    if (!userSeasonPoints.exists) {
      // User not yet in season, return empty leaderboard
      const rawResponse = {
        entries: [],
        groupId: null,
        leagueNumber: null,
        seasonId: currentSeasonId,
        totalMembers: 0,
      };
      GetLeaderboardResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    const userData = userSeasonPoints.data() as {
      league?: number;
      groupId?: string;
      points?: number;
    };

    const userLeague = userData?.league ?? 1;
    const userGroupId = userData?.groupId;

    if (!userGroupId) {
      // User doesn't have a group yet, return empty leaderboard
      const rawResponse = {
        entries: [],
        groupId: null,
        leagueNumber: userLeague,
        seasonId: currentSeasonId,
        totalMembers: 0,
      };
      GetLeaderboardResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    // Get all members in the group
    // Note: We need an index on points for this query to work
    // Collection: leagueGroups/{seasonId}_{leagueNumber}/groups/{groupId}/members
    // Index: points (descending)
    const groupMembersRef = db
      .collection("leagueGroups")
      .doc(`${currentSeasonId}_${userLeague}`)
      .collection("groups")
      .doc(userGroupId)
      .collection("members");

    const membersSnapshot = await groupMembersRef
      .orderBy("points", "desc")
      .get();

    // Get user info for each member
    const entries = await Promise.all(
      membersSnapshot.docs.map(async (doc, index) => {
        const memberData = doc.data() as {
          userId: string;
          points?: number;
          lastActivityAt?: FirebaseFirestore.Timestamp | null;
        };

        // Get username from user document
        let username = "Unknown";
        try {
          const userDoc = await db.doc(`users/${memberData.userId}`).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            username = userData?.username || userData?.name || "Unknown";
          }
        } catch (error) {
          logger.warn("Error fetching username", { userId: memberData.userId });
        }

        return {
          userId: memberData.userId,
          username,
          points: memberData.points ?? 0,
          position: index + 1,
          lastActivityAt: memberData.lastActivityAt ?? null,
        };
      })
    );

    const rawResponse = {
      entries,
      groupId: userGroupId,
      leagueNumber: userLeague,
      seasonId: currentSeasonId,
      totalMembers: entries.length,
    };
    GetLeaderboardResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting leaderboard", error);
    handleZodError(error, "getLeaderboard");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get leaderboard");
  }
});

/**
 * Get user's ranking position in their group
 */
export const getUserRanking = onCall(async (request) => {
  const parsed = GetUserRankingRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, seasonId } = parsed.data;

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new HttpsError("failed-precondition", "No active season");
      }
      const seasonData = seasonDoc.data() as { seasonId?: string };
      currentSeasonId = seasonData?.seasonId;
      if (!currentSeasonId) {
        throw new HttpsError("failed-precondition", "No active season");
      }
    }

    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();

    if (!userSeasonPoints.exists) {
      const rawResponse = {
        position: null,
        groupId: null,
        leagueNumber: null,
        points: 0,
        totalMembers: null,
      };
      GetUserRankingResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    const rawUserData = userSeasonPoints.data();
    const validatedUserData = SeasonUserPointsSchema.parse(rawUserData);

    const userLeague = validatedUserData.league ?? 1;
    const userGroupId = validatedUserData.groupId;
    const userPoints = validatedUserData.points ?? 0;

    if (!userGroupId) {
      const rawResponse = {
        position: null,
        groupId: null,
        leagueNumber: userLeague,
        points: userPoints,
        totalMembers: null,
      };
      GetUserRankingResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    // Count how many users in the group have more points
    const groupRef = db
      .collection("leagueGroups")
      .doc(`${currentSeasonId}_${userLeague}`)
      .collection("groups")
      .doc(userGroupId)
      .collection("members");

    // Get all members and calculate position
    const allMembers = await groupRef.get();
    const membersWithMorePoints = allMembers.docs.filter(
      (doc) => (doc.data().points ?? 0) > userPoints
    );

    const position = membersWithMorePoints.length + 1;

    const rawResponse = {
      position,
      groupId: userGroupId,
      leagueNumber: userLeague,
      points: userPoints,
      totalMembers: (await groupRef.get()).size,
    };
    GetUserRankingResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting user ranking", error);
    handleZodError(error, "getUserRanking");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user ranking");
  }
});

/**
 * Get rankings for followed users (friends in their groups)
 */
export const getFollowingRankings = onCall(async (request) => {
  const parsed = GetFollowingRankingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, seasonId } = parsed.data;

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new HttpsError("failed-precondition", "No active season");
      }
      const seasonData = seasonDoc.data() as { seasonId?: string };
      currentSeasonId = seasonData?.seasonId;
      if (!currentSeasonId) {
        throw new HttpsError("failed-precondition", "No active season");
      }
    }

    // Get user's friends
    const followingDocs = await db
      .collection(`users/${userId}/following`)
      .get();
    if (followingDocs.empty) {
      const rawResponse = { rankings: [] as Array<null> };
      GetFollowingRankingsResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    const rawFollowingData = followingDocs.docs.map((doc) => doc.data());
    const followingData = rawFollowingData as Array<{ userId: string }>;
    const following = FollowingArraySchema.parse(followingData);

    if (following.length === 0) {
      const rawResponse = { rankings: [] as Array<null> };
      GetFollowingRankingsResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    // Get ranking info for each friend
    const rankings = await Promise.all(
      following.map(async (following: Following) => {
        try {
          const friendId = following.userId;
          const friendSeasonPointsRef = db.doc(
            `seasonUserPoints/${currentSeasonId}/users/${friendId}`
          );
          const friendSeasonPoints = await friendSeasonPointsRef.get();

          if (!friendSeasonPoints.exists) {
            return null;
          }

          // Logic-Critical Data (PARSE IT): friendData is used in conditions (if (!friendGroupId)) and for position calculations
          const rawFriendData = friendSeasonPoints.data();
          const validatedFriendData =
            SeasonUserPointsSchema.parse(rawFriendData);

          const friendLeague = validatedFriendData.league ?? 1;
          const friendGroupId = validatedFriendData.groupId;
          const friendPoints = validatedFriendData.points ?? 0;

          if (!friendGroupId) {
            return {
              userId: friendId,
              position: null,
              points: friendPoints,
              leagueNumber: friendLeague,
            };
          }

          // Get friend's position in their group
          const groupRef = db
            .collection("leagueGroups")
            .doc(`${currentSeasonId}_${friendLeague}`)
            .collection("groups")
            .doc(friendGroupId)
            .collection("members");

          // Get all members and filter client-side (more reliable than where query)
          const allMembers = await groupRef.get();
          const membersWithMorePoints = allMembers.docs.filter(
            (doc) => (doc.data().points ?? 0) > friendPoints
          );

          const position = membersWithMorePoints.length + 1;
          const totalMembers = (await groupRef.get()).size;

          // Get friend's username
          const friendUserDoc = await db.doc(`users/${friendId}`).get();
          let username = "Unknown";
          if (friendUserDoc.exists) {
            const friendUserData = friendUserDoc.data();
            username =
              friendUserData?.username || friendUserData?.name || "Unknown";
          }

          return {
            userId: friendId,
            username,
            position,
            points: friendPoints,
            leagueNumber: friendLeague,
            groupId: friendGroupId,
            totalMembers,
          };
        } catch (error) {
          logger.warn("Error getting friend ranking", {
            userId: following.userId,
            error,
          });
          return null;
        }
      })
    );

    // Filter out nulls and sort by points descending
    const validRankings = rankings
      .filter((r: unknown) => r !== null)
      .sort(
        (a: { points?: number } | null, b: { points?: number } | null) =>
          (b?.points ?? 0) - (a?.points ?? 0)
      );

    const rawResponse = { rankings: validRankings };
    GetFollowingRankingsResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting following rankings", error);
    handleZodError(error, "getFollowingRankings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get following rankings");
  }
});

/**
 * Assign user to a league group
 * Finds an available group with less than 20 members, or creates a new one
 */
export const assignUserToGroup = onCall(async (request) => {
  const parsed = AssignUserToGroupRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsed.error.issues,
    });
  }

  const { userId, leagueNumber, seasonId } = parsed.data;

  try {
    // Get user's current league if not provided separately
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const rawUserData = userDoc.data();
    const validatedUserData = UserSchema.pick({ league: true }).parse(
      rawUserData
    );
    const userLeague = leagueNumber ?? validatedUserData.league ?? 1;

    // Find a group with less than 20 members
    const groupsRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${userLeague}`)
      .collection("groups");

    const allGroupsSnapshot = await groupsRef.get();

    let targetGroupId: string | null = null;

    // Find first group with capacity
    for (const groupDoc of allGroupsSnapshot.docs) {
      const rawGroupData = groupDoc.data();
      const validatedGroupData = LeagueGroupSchema.pick({
        currentCount: true,
        isFull: true,
        capacity: true,
      }).parse(rawGroupData);

      const currentCount = validatedGroupData.currentCount ?? 0;
      const capacity = validatedGroupData.capacity ?? 20;
      const isFull = validatedGroupData.isFull ?? false;

      if (!isFull && currentCount < capacity) {
        targetGroupId = groupDoc.id;
        break;
      }
    }

    // If no group found, create a new one
    if (!targetGroupId) {
      const newGroupRef = groupsRef.doc();
      targetGroupId = newGroupRef.id;

      // Waliduj i typuj LeagueGroup przed zapisem (bez createdAt - użyjemy FieldValue)
      const leagueGroupData: Omit<LeagueGroup, "createdAt" | "id"> = {
        isFull: false,
        capacity: 20,
        currentCount: 0,
        leagueNumber: userLeague,
      };
      LeagueGroupSchema.omit({ createdAt: true, id: true }).parse(
        leagueGroupData
      );

      await newGroupRef.set({
        ...leagueGroupData,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Get user's points
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${seasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();
    const userPointsData = userSeasonPoints.exists
      ? SeasonUserPointsSchema.pick({ points: true }).parse(
          userSeasonPoints.data()
        )
      : { points: 0 };

    // Add user to group members
    const memberRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${userLeague}`)
      .collection("groups")
      .doc(targetGroupId)
      .collection("members")
      .doc(userId);

    await db.runTransaction(async (trx) => {
      // Check group capacity again
      const groupDoc = await trx.get(
        db
          .collection("leagueGroups")
          .doc(`${seasonId}_${userLeague}`)
          .collection("groups")
          .doc(targetGroupId)
      );

      const rawGroupData = groupDoc.data();
      const validatedGroupData = LeagueGroupSchema.pick({
        currentCount: true,
        capacity: true,
      }).parse(rawGroupData);

      const currentCount = validatedGroupData.currentCount ?? 0;
      const capacity = validatedGroupData.capacity ?? 20;

      if (currentCount >= capacity) {
        throw new HttpsError("failed-precondition", "Group is full");
      }

      // Waliduj dane członka grupy przed zapisem
      const memberPoints = userPointsData.points ?? 0;
      if (memberPoints < 0) {
        throw new HttpsError("invalid-argument", "Points cannot be negative");
      }

      // Add member
      trx.set(memberRef, {
        userId,
        points: memberPoints,
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Update group count (whitelist)
      const safeGroupUpdate = LeagueGroupUpdateSchema.parse({
        currentCount: currentCount + 1,
        isFull: currentCount + 1 >= capacity,
      });
      trx.update(groupDoc.ref, safeGroupUpdate);

      // Update user's group assignment (season points) z whitelist
      const safeSeasonUpdate = SeasonUserPointsAssignUpdateSchema.parse({
        groupId: targetGroupId,
        league: userLeague,
      });
      trx.update(userSeasonPointsRef, safeSeasonUpdate);

      // Update user document (league + group) z whitelist
      const safeUserUpdate = UserLeagueAssignUpdateSchema.parse({
        currentGroupId: targetGroupId,
        league: userLeague,
      });
      trx.update(db.doc(`users/${userId}`), safeUserUpdate);
    });

    logger.info("User assigned to group", {
      userId,
      leagueNumber: userLeague,
      groupId: targetGroupId,
      seasonId,
    });

    const rawResponse = { success: true, groupId: targetGroupId };
    AssignUserToGroupResponseSchema.parse(rawResponse);
    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error assigning user to group", error);
    handleZodError(error, "assignUserToGroup");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to assign user to group");
  }
});
