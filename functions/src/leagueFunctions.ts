import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  LeagueGroup,
  LeagueGroupSchema,
  Season,
  SeasonSchema,
  SeasonUserPoints,
  SeasonUserPointsSchema,
  User,
  UserSchema,
} from "./types/common";

const db = getFirestore();

interface LeagueInfo {
  id: number;
  name: string;
  color: string;
  description: string;
}

// League definitions matching frontend
const LEAGUE_INFO: LeagueInfo[] = [
  { id: 1, name: "Liga 1", color: "#8D8D8D", description: "Startowa liga" },
  { id: 2, name: "Liga 2", color: "#7DA1B9", description: "Wejdź do Top 10" },
  { id: 3, name: "Liga 3", color: "#7EC384", description: "Stabilny rozwój" },
  { id: 4, name: "Liga 4", color: "#A9D68B", description: "Trzymaj passę" },
  { id: 5, name: "Liga 5", color: "#C7E3A1", description: "Wyższy poziom" },
  {
    id: 6,
    name: "Liga 6",
    color: "#E4F0B8",
    description: "Lepsza konkurencja",
  },
  { id: 7, name: "Liga 7", color: "#F9C9A7", description: "Stań na podium" },
  {
    id: 8,
    name: "Liga 8",
    color: "#F6B38F",
    description: "Top 5 na wyciągnięcie",
  },
  { id: 9, name: "Liga 9", color: "#F29B78", description: "Blisko awansu" },
  { id: 10, name: "Liga 10", color: "#F27C8A", description: "Silna stawka" },
  { id: 11, name: "Liga 11", color: "#CD7F32", description: "Brązowa Liga" },
  { id: 12, name: "Liga 12", color: "#C0C0C0", description: "Srebrna Liga" },
  { id: 13, name: "Liga 13", color: "#FFD700", description: "Złota Liga" },
  { id: 14, name: "Liga 14", color: "#6A5ACD", description: "Platynowa Liga" },
  { id: 15, name: "Liga 15", color: "#00BFFF", description: "Diamentowa Liga" },
];

/**
 * Get league information
 */
export const getLeagueInfo = onCall(async (request) => {
  const { leagueNumber } = request.data || {};

  if (!leagueNumber || leagueNumber < 1 || leagueNumber > 15) {
    throw new Error("Valid leagueNumber (1-15) is required");
  }

  try {
    const league = LEAGUE_INFO.find((l) => l.id === leagueNumber);

    if (!league) {
      throw new Error("League not found");
    }

    return { league };
  } catch (error) {
    logger.error("Error getting league info", error);
    throw new Error("Failed to get league info");
  }
});

/**
 * Get user's current group information
 */
export const getUserGroup = onCall(async (request) => {
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
      const seasonData = seasonDoc.data() as Season;
      const validatedSeason = SeasonSchema.parse(seasonData);
      currentSeasonId = validatedSeason.id;
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

    const userData = userSeasonPoints.data() as SeasonUserPoints;
    const validatedUserData = SeasonUserPointsSchema.parse(userData);

    if (!validatedUserData.groupId) {
      return null;
    }

    // Get group info
    const groupRef = db
      .collection("leagueGroups")
      .doc(`${currentSeasonId}_${validatedUserData.league}`)
      .collection("groups")
      .doc(validatedUserData.groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      logger.error("Group not found", {
        seasonId: currentSeasonId,
        league: validatedUserData.league,
        groupId: validatedUserData.groupId,
      });
      return null;
    }

    const groupData = { id: groupRef.id, ...groupDoc.data() } as LeagueGroup;
    const validatedGroup = LeagueGroupSchema.parse(groupData);

    return {
      groupId: validatedGroup.id,
      leagueNumber: validatedGroup.leagueNumber,
      memberCount: validatedGroup.currentCount,
      capacity: validatedGroup.capacity,
      isFull: validatedGroup.isFull,
    };
  } catch (error) {
    logger.error("Error getting user group", error);
    throw new Error("Failed to get user group");
  }
});

/**
 * Update user's league and assign to new group
 */
export const updateUserLeague = onCall(async (request) => {
  const { userId, newLeague, seasonId } = request.data || {};

  if (!userId || !newLeague) {
    throw new Error("userId and newLeague are required");
  }

  if (newLeague < 1 || newLeague > 15) {
    throw new Error("newLeague must be between 1 and 15");
  }

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new Error("No active season");
      }
      const seasonData = { id: seasonDoc.id, ...seasonDoc.data() } as Season;
      const validatedSeason = SeasonSchema.parse(seasonData);
      currentSeasonId = validatedSeason.id;

      if (!currentSeasonId) {
        throw new Error("No active season");
      }
    }

    // Get current user data
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = { id: userDoc.id, ...userDoc.data() } as User;
    const validatedUserData = UserSchema.parse(userData);

    const currentLeague = validatedUserData.league;

    if (currentLeague === newLeague) {
      return { success: true, league: newLeague };
    }

    // Get old data BEFORE updating (important: must read before write)
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const oldUserSeasonPoints = await userSeasonPointsRef.get();

    const oldData = oldUserSeasonPoints.exists
      ? (oldUserSeasonPoints.data() as {
          league?: number;
          groupId?: string;
        })
      : null;
    const oldLeague = oldData?.league ?? currentLeague;
    const oldGroupId = oldData?.groupId;

    if (oldGroupId) {
      const oldGroupRef = db
        .collection("leagueGroups")
        .doc(`${currentSeasonId}_${oldLeague}`)
        .collection("groups")
        .doc(oldGroupId);
      const oldGroupDoc = await oldGroupRef.get();

      if (oldGroupDoc.exists) {
        const oldGroupData = oldGroupDoc.data() as {
          currentCount?: number;
        };
        const newCount = Math.max(0, (oldGroupData?.currentCount ?? 1) - 1);

        await oldGroupRef.update({
          currentCount: newCount,
          isFull: false,
        });

        // Remove user from old group members
        const oldMemberRef = db
          .collection("leagueGroups")
          .doc(`${currentSeasonId}_${oldLeague}`)
          .collection("groups")
          .doc(oldGroupId)
          .collection("members")
          .doc(userId);
        await oldMemberRef.delete();
      }
    }

    // NOW update user's league (after removing from old group)
    await userDoc.ref.update({
      league: newLeague,
      currentGroupId: FieldValue.delete(), // Will be reassigned
    });

    // Update season user points (after removing from old group)
    await userSeasonPointsRef.set(
      {
        league: newLeague,
        groupId: FieldValue.delete(), // Will be reassigned
      },
      { merge: true }
    );

    // Assign to new group in new league
    // We'll use the assignUserToGroup function logic inline since we can't call another onCall from here
    const groupsRef = db
      .collection("leagueGroups")
      .doc(`${currentSeasonId}_${newLeague}`)
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

      // Waliduj i typuj LeagueGroup przed zapisem (bez createdAt - użyjemy FieldValue)
      const leagueGroupData: Omit<LeagueGroup, "createdAt" | "id"> = {
        isFull: false,
        capacity: 20,
        currentCount: 0,
        leagueNumber: newLeague,
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
    const userPointsData = oldUserSeasonPoints.exists
      ? (oldUserSeasonPoints.data() as { points?: number })
      : { points: 0 };

    // Add user to new group
    const memberRef = db
      .collection("leagueGroups")
      .doc(`${currentSeasonId}_${newLeague}`)
      .collection("groups")
      .doc(targetGroupId)
      .collection("members")
      .doc(userId);

    await db.runTransaction(async (trx) => {
      // Check group capacity again
      const groupDoc = await trx.get(
        db
          .collection("leagueGroups")
          .doc(`${currentSeasonId}_${newLeague}`)
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

      // Waliduj dane członka grupy przed zapisem
      const memberPoints = userPointsData.points ?? 0;
      if (memberPoints < 0) {
        throw new Error("Points cannot be negative");
      }

      // Add member
      trx.set(memberRef, {
        userId,
        points: memberPoints,
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
        league: newLeague,
      });

      // Update user document
      trx.update(db.doc(`users/${userId}`), {
        currentGroupId: targetGroupId,
        league: newLeague,
      });
    });

    logger.info("User league updated", {
      userId,
      fromLeague: currentLeague,
      toLeague: newLeague,
      groupId: targetGroupId,
      seasonId: currentSeasonId,
    });

    return { success: true, league: newLeague, groupId: targetGroupId };
  } catch (error) {
    logger.error("Error updating user league", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update user league");
  }
});

/**
 * Get all league information
 */
export const getAllLeaguesInfo = onCall(async () => {
  try {
    return { leagues: LEAGUE_INFO };
  } catch (error) {
    logger.error("Error getting all leagues info", error);
    throw new Error("Failed to get all leagues info");
  }
});
