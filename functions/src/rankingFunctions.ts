import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Get leaderboard for user's group (20-person league group)
 * Returns the ranking of all members in the user's current league group
 */
export const getLeaderboard = onCall(async (request) => {
  const { userId, seasonId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    // Get current season if not provided
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new Error("No active season");
      }
      const seasonData = seasonDoc.data() as { seasonId?: string };
      currentSeasonId = seasonData?.seasonId;
      if (!currentSeasonId) {
        throw new Error("No active season");
      }
    }

    // Get user's league and group info
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();

    if (!userSeasonPoints.exists) {
      // User not yet in season, return empty leaderboard
      return {
        entries: [],
        groupId: null,
        leagueNumber: null,
        seasonId: currentSeasonId,
      };
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
      return {
        entries: [],
        groupId: null,
        leagueNumber: userLeague,
        seasonId: currentSeasonId,
      };
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
          lastActivityAt?: any;
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

    return {
      entries,
      groupId: userGroupId,
      leagueNumber: userLeague,
      seasonId: currentSeasonId,
      totalMembers: entries.length,
    };
  } catch (error) {
    logger.error("Error getting leaderboard", error);
    throw new Error("Failed to get leaderboard");
  }
});

/**
 * Get user's ranking position in their group
 */
export const getUserRanking = onCall(async (request) => {
  const { userId, seasonId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new Error("No active season");
      }
      const seasonData = seasonDoc.data() as { seasonId?: string };
      currentSeasonId = seasonData?.seasonId;
      if (!currentSeasonId) {
        throw new Error("No active season");
      }
    }

    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();

    if (!userSeasonPoints.exists) {
      return null;
    }

    const userData = userSeasonPoints.data() as {
      league?: number;
      groupId?: string;
      points?: number;
    };

    const userLeague = userData?.league ?? 1;
    const userGroupId = userData?.groupId;
    const userPoints = userData?.points ?? 0;

    if (!userGroupId) {
      return null;
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

    return {
      position,
      groupId: userGroupId,
      leagueNumber: userLeague,
      points: userPoints,
      totalMembers: (await groupRef.get()).size,
    };
  } catch (error) {
    logger.error("Error getting user ranking", error);
    throw new Error("Failed to get user ranking");
  }
});

/**
 * Get rankings for followed users (friends in their groups)
 */
export const getFollowingRankings = onCall(async (request) => {
  const { userId, seasonId } = request.data || {};

  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new Error("No active season");
      }
      const seasonData = seasonDoc.data() as { seasonId?: string };
      currentSeasonId = seasonData?.seasonId;
      if (!currentSeasonId) {
        throw new Error("No active season");
      }
    }

    // Get user's friends
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return { rankings: [] };
    }

    const userData = userDoc.data() as { friends?: string[] };
    const friends = userData?.friends || [];

    if (friends.length === 0) {
      return { rankings: [] };
    }

    // Get ranking info for each friend
    const rankings = await Promise.all(
      friends.map(async (friendId) => {
        try {
          const friendSeasonPointsRef = db.doc(
            `seasonUserPoints/${currentSeasonId}/users/${friendId}`
          );
          const friendSeasonPoints = await friendSeasonPointsRef.get();

          if (!friendSeasonPoints.exists) {
            return null;
          }

          const friendData = friendSeasonPoints.data() as {
            league?: number;
            groupId?: string;
            points?: number;
          };

          const friendLeague = friendData?.league ?? 1;
          const friendGroupId = friendData?.groupId;
          const friendPoints = friendData?.points ?? 0;

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
          logger.warn("Error getting friend ranking", { friendId, error });
          return null;
        }
      })
    );

    // Filter out nulls and sort by points descending
    const validRankings = rankings
      .filter((r) => r !== null)
      .sort((a, b) => (b?.points ?? 0) - (a?.points ?? 0));

    return { rankings: validRankings };
  } catch (error) {
    logger.error("Error getting following rankings", error);
    throw new Error("Failed to get following rankings");
  }
});

/**
 * Assign user to a league group
 * Finds an available group with less than 20 members, or creates a new one
 */
export const assignUserToGroup = onCall(async (request) => {
  const { userId, leagueNumber, seasonId } = request.data || {};

  if (!userId || !leagueNumber || !seasonId) {
    throw new Error("userId, leagueNumber, and seasonId are required");
  }

  try {
    // Get user's current league if not provided separately
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data() as { league?: number };
    const userLeague = leagueNumber ?? userData?.league ?? 1;

    // Find a group with less than 20 members
    const groupsRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${userLeague}`)
      .collection("groups");

    const allGroupsSnapshot = await groupsRef.get();

    let targetGroupId: string | null = null;

    // Find first group with capacity
    for (const groupDoc of allGroupsSnapshot.docs) {
      const groupData = groupDoc.data() as {
        currentCount?: number;
        isFull?: boolean;
        capacity?: number;
      };

      const currentCount = groupData?.currentCount ?? 0;
      const capacity = groupData?.capacity ?? 20;
      const isFull = groupData?.isFull ?? false;

      if (!isFull && currentCount < capacity) {
        targetGroupId = groupDoc.id;
        break;
      }
    }

    // If no group found, create a new one
    if (!targetGroupId) {
      const newGroupRef = groupsRef.doc();
      targetGroupId = newGroupRef.id;

      await newGroupRef.set({
        createdAt: FieldValue.serverTimestamp(),
        isFull: false,
        capacity: 20,
        currentCount: 0,
        seasonId,
        leagueNumber: userLeague,
      });
    }

    // Get user's points
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${seasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();
    const userPointsData = userSeasonPoints.exists
      ? (userSeasonPoints.data() as { points?: number })
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

      const groupData = groupDoc.data() as {
        currentCount?: number;
        isFull?: boolean;
        capacity?: number;
      };

      const currentCount = groupData?.currentCount ?? 0;
      const capacity = groupData?.capacity ?? 20;

      if (currentCount >= capacity) {
        throw new Error("Group is full");
      }

      // Add member
      trx.set(memberRef, {
        userId,
        points: userPointsData.points ?? 0,
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Update group count
      trx.update(groupDoc.ref, {
        currentCount: currentCount + 1,
        isFull: currentCount + 1 >= capacity,
      });

      // Update user's group assignment
      trx.update(userSeasonPointsRef, {
        groupId: targetGroupId,
        league: userLeague,
      });

      // Update user document
      trx.update(db.doc(`users/${userId}`), {
        currentGroupId: targetGroupId,
        league: userLeague,
      });
    });

    logger.info("User assigned to group", {
      userId,
      leagueNumber: userLeague,
      groupId: targetGroupId,
      seasonId,
    });

    return { success: true, groupId: targetGroupId };
  } catch (error) {
    logger.error("Error assigning user to group", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to assign user to group");
  }
});
