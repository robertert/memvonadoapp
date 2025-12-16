import { HttpsError, onCall } from "firebase-functions/v2/https";
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
  GetLeagueInfoResponseSchema,
  GetUserGroupResponseSchema,
  GetAllLeaguesInfoResponseSchema,
} from "./types/common";
import {
  GetLeagueInfoRequestSchema,
  GetUserGroupRequestSchema,
  UpdateUserLeagueRequestSchema,
} from "memvocado-types/schemas/api/league";
import { serializeTimestamps } from "./utils/serialization";
import { z } from "zod";

const db = getFirestore();

/**
 * Schematy update (whitelist) dla operacji na user/season/group.
 * Używane wyłącznie przy update/set, żeby nie dopuścić przypadkowych pól.
 */
const UserLeagueUpdateSchema = UserSchema.pick({
  league: true,
  currentGroupId: true,
}).partial();

const SeasonUserPointsUpdateSchema = SeasonUserPointsSchema.pick({
  league: true,
  groupId: true,
}).partial();

const LeagueGroupUpdateSchema = LeagueGroupSchema.pick({
  currentCount: true,
  isFull: true,
}).partial();

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
  // Walidacja request.data
  const validationResult = GetLeagueInfoRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { leagueNumber } = validationResult.data;

  try {
    const league = LEAGUE_INFO.find((l) => l.id === leagueNumber);

    if (!league) {
      throw new HttpsError("not-found", "League not found");
    }

    const rawResponse = { league };
    GetLeagueInfoResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting league info", error);

    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to get league info");
  }
});

/**
 * Get user's current group information
 */
export const getUserGroup = onCall(async (request) => {
  // Autoryzacja
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Walidacja request.data
  const validationResult = GetUserGroupRequestSchema.safeParse(request.data);
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { userId, seasonId } = validationResult.data;

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new HttpsError("failed-precondition", "No active season");
      }
      const seasonData = seasonDoc.data() as Season;
      const validatedSeason = SeasonSchema.parse(seasonData);
      currentSeasonId = validatedSeason.id;
      if (!currentSeasonId) {
        throw new HttpsError("failed-precondition", "No active season");
      }
    }

    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const userSeasonPoints = await userSeasonPointsRef.get();

    if (!userSeasonPoints.exists) {
      // Zwróć odpowiedź zgodną ze schematem z null dla groupId i leagueNumber
      const rawResponse = {
        groupId: null,
        leagueNumber: null,
        memberCount: 0,
        capacity: 20,
        isFull: false,
      };
      GetUserGroupResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    const userData = userSeasonPoints.data() as SeasonUserPoints;
    const validatedUserData = SeasonUserPointsSchema.parse(userData);

    if (!validatedUserData.groupId) {
      // Zwróć odpowiedź zgodną ze schematem z null dla groupId i leagueNumber
      const rawResponse = {
        groupId: null,
        leagueNumber: null,
        memberCount: 0,
        capacity: 20,
        isFull: false,
      };
      GetUserGroupResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
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
      // Zwróć odpowiedź zgodną ze schematem z null dla groupId i leagueNumber
      const rawResponse = {
        groupId: null,
        leagueNumber: null,
        memberCount: 0,
        capacity: 20,
        isFull: false,
      };
      GetUserGroupResponseSchema.parse(rawResponse);
      return serializeTimestamps(rawResponse);
    }

    const groupData = { id: groupRef.id, ...groupDoc.data() } as LeagueGroup;
    const validatedGroup = LeagueGroupSchema.parse(groupData);

    const rawResponse = {
      groupId: validatedGroup.id,
      leagueNumber: validatedGroup.leagueNumber,
      memberCount: validatedGroup.currentCount,
      capacity: validatedGroup.capacity,
      isFull: validatedGroup.isFull,
    };

    // Walidacja odpowiedzi przed zwróceniem
    GetUserGroupResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting user group", error);

    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to get user group");
  }
});

/**
 * Update user's league and assign to new group
 */
export const updateUserLeague = onCall(async (request) => {
  // Autoryzacja
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  // Walidacja request.data
  const validationResult = UpdateUserLeagueRequestSchema.safeParse(
    request.data
  );
  if (!validationResult.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: validationResult.error.issues,
    });
  }

  const { userId, newLeague, seasonId } = validationResult.data;

  try {
    let currentSeasonId = seasonId;
    if (!currentSeasonId) {
      const seasonDoc = await db.doc("ranking/currentSeason").get();
      if (!seasonDoc.exists) {
        throw new HttpsError("failed-precondition", "No active season");
      }
      const seasonData = { id: seasonDoc.id, ...seasonDoc.data() } as Season;
      const validatedSeason = SeasonSchema.parse(seasonData);
      currentSeasonId = validatedSeason.id;

      if (!currentSeasonId) {
        throw new HttpsError("failed-precondition", "No active season");
      }
    }

    // Get current user data
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = { id: userDoc.id, ...userDoc.data() } as User;
    const validatedUserData = UserSchema.parse(userData);

    const currentLeague = validatedUserData.league;

    if (currentLeague === newLeague) {
      return serializeTimestamps({ success: true, league: newLeague });
    }

    // Get old data BEFORE updating (important: must read before write)
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${currentSeasonId}/users/${userId}`
    );
    const oldUserSeasonPoints = await userSeasonPointsRef.get();

    const oldData = oldUserSeasonPoints.exists
      ? SeasonUserPointsSchema.pick({ league: true, groupId: true }).parse(
          oldUserSeasonPoints.data()
        )
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
        const rawOldGroupData = oldGroupDoc.data();
        const validatedOldGroupData = LeagueGroupSchema.pick({
          currentCount: true,
        }).parse(rawOldGroupData);
        const newCount = Math.max(
          0,
          (validatedOldGroupData.currentCount ?? 1) - 1
        );
        const safeGroupUpdate = LeagueGroupUpdateSchema.parse({
          currentCount: newCount,
          isFull: false,
        });

        await oldGroupRef.update(safeGroupUpdate);

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
    const safeUserLeagueUpdate = UserLeagueUpdateSchema.parse({
      league: newLeague,
    });
    await userDoc.ref.update({
      ...safeUserLeagueUpdate,
      currentGroupId: FieldValue.delete(), // Will be reassigned
    });

    // Update season user points (after removing from old group)
    const safeSeasonUpdate = SeasonUserPointsUpdateSchema.parse({
      league: newLeague,
    });
    await userSeasonPointsRef.set(
      {
        ...safeSeasonUpdate,
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

    const userPointsData = oldUserSeasonPoints.exists
      ? SeasonUserPointsSchema.pick({ points: true }).parse(
          oldUserSeasonPoints.data()
        )
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
      // Uwaga: members collection używa struktury { userId, points, lastActivityAt }
      // która różni się od LeagueGroupMemberSchema (który używa { id, username, points, lastActivityAt })
      const memberPoints = userPointsData.points ?? 0;
      if (memberPoints < 0) {
        throw new HttpsError("invalid-argument", "Points cannot be negative");
      }

      // Add member (walidacja points już powyżej)
      trx.set(memberRef, {
        userId,
        points: memberPoints,
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Update group count z whitelist/parse
      const safeGroupUpdate = LeagueGroupUpdateSchema.parse({
        currentCount: currentCount + 1,
        isFull: currentCount + 1 >= capacity,
      });
      trx.update(groupDoc.ref, safeGroupUpdate);

      // Update user's group assignment (season points) z whitelist
      const safeSeasonAssignUpdate = SeasonUserPointsUpdateSchema.parse({
        groupId: targetGroupId,
        league: newLeague,
      });
      trx.update(userSeasonPointsRef, safeSeasonAssignUpdate);

      // Update user document (league + group) z whitelist
      const safeUserAssignUpdate = UserLeagueUpdateSchema.parse({
        currentGroupId: targetGroupId,
        league: newLeague,
      });
      trx.update(db.doc(`users/${userId}`), safeUserAssignUpdate);
    });

    logger.info("User league updated", {
      userId,
      fromLeague: currentLeague,
      toLeague: newLeague,
      groupId: targetGroupId,
      seasonId: currentSeasonId,
    });

    return serializeTimestamps({
      success: true,
      league: newLeague,
      groupId: targetGroupId,
    });
  } catch (error) {
    logger.error("Error updating user league", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Failed to update user league");
  }
});

/**
 * Get all league information
 */
export const getAllLeaguesInfo = onCall(async () => {
  try {
    const rawResponse = { leagues: LEAGUE_INFO };

    // Walidacja odpowiedzi przed zwróceniem
    GetAllLeaguesInfoResponseSchema.parse(rawResponse);

    return serializeTimestamps(rawResponse);
  } catch (error) {
    logger.error("Error getting all leagues info", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get all leagues info");
  }
});
