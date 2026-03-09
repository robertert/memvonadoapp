import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  LeagueGroupSchema,
  SeasonUserPointsSchema,
  UserSchema,
  GetCurrentSeasonResponseSchema,
  type LeagueGroup,
  type SeasonUserPoints,
  type User,
} from "../../types/common";
import type { LeagueRepository } from "../interfaces/LeagueRepository";

const db = getFirestore();

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

// For assignUserToGroup transaction
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

/**
 * Firestore-backed implementation of LeagueRepository.
 */
export class FirestoreLeagueRepository implements LeagueRepository {
  /**
   * @param {string} [seasonId] - Optional season ID; fetches from DB if omitted.
   * @return {Promise<string>} Validated current season ID.
   */
  async getCurrentSeasonId(seasonId?: string): Promise<string> {
    if (seasonId) return seasonId;

    const seasonDoc = await db.doc("ranking/currentSeason").get();
    if (!seasonDoc.exists) {
      throw new HttpsError("failed-precondition", "No active season");
    }

    const validatedSeason = GetCurrentSeasonResponseSchema.pick({
      seasonId: true,
    }).parse(seasonDoc.data());

    if (!validatedSeason.seasonId) {
      throw new HttpsError("failed-precondition", "No active season");
    }

    return validatedSeason.seasonId;
  }

  /**
   * @param {string} seasonId - Season ID.
   * @param {string} userId - User ID.
   * @return {Promise<SeasonUserPoints | null>} Season points or null.
   */
  async getUserSeasonPoints(
    seasonId: string,
    userId: string
  ): Promise<SeasonUserPoints | null> {
    const snap = await db
      .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
      .get();
    if (!snap.exists) return null;
    return SeasonUserPointsSchema.parse(snap.data());
  }

  /**
   * @param {string} userId - User ID.
   * @return {Promise<User | null>} User document or null.
   */
  async getUserById(userId: string): Promise<User | null> {
    const snap = await db.doc(`users/${userId}`).get();
    if (!snap.exists) return null;
    return UserSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} seasonId - Season ID.
   * @param {number} leagueNumber - League number.
   * @param {string} groupId - Group document ID.
   * @return {Promise<LeagueGroup | null>} Group document or null.
   */
  async getGroupById(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<LeagueGroup | null> {
    const snap = await db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId)
      .get();
    if (!snap.exists) return null;
    return LeagueGroupSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * Removes the user from the group members, decrements group count,
   * and clears the user's groupId in seasonUserPoints.
   * @param {string} seasonId - Season ID.
   * @param {number} leagueNumber - League number.
   * @param {string} groupId - Group ID to remove from.
   * @param {string} userId - User ID to remove.
   * @return {Promise<void>}
   */
  async removeUserFromGroup(
    seasonId: string,
    leagueNumber: number,
    groupId: string,
    userId: string
  ): Promise<void> {
    const groupRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId);

    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) return;

    const rawGroupData = groupDoc.data() || {};
    const currentCount =
      (rawGroupData as { currentCount?: number }).currentCount ?? 1;
    const newCount = Math.max(0, currentCount - 1);

    const safeGroupUpdate = LeagueGroupUpdateSchema.parse({
      currentCount: newCount,
      isFull: false,
    });
    await groupRef.update(safeGroupUpdate);

    const memberRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId);
    await memberRef.delete();

    // Clear user's groupId reference in season points
    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${seasonId}/users/${userId}`
    );
    await userSeasonPointsRef.set({ groupId: FieldValue.delete() }, { merge: true });
  }

  /**
   * Sets the user's league and clears their currentGroupId (will be reassigned).
   * @param {string} userId - User ID.
   * @param {number} league - New league number.
   * @return {Promise<void>}
   */
  async updateUserLeagueDoc(userId: string, league: number): Promise<void> {
    const safeUpdate = UserLeagueUpdateSchema.parse({ league });
    await db.doc(`users/${userId}`).update({
      ...safeUpdate,
      currentGroupId: FieldValue.delete(),
    });
  }

  /**
   * Merge-sets the provided fields on the user's seasonUserPoints document.
   * @param {string} seasonId - Season ID.
   * @param {string} userId - User ID.
   * @param {Partial<SeasonUserPoints>} data - Fields to update.
   * @return {Promise<void>}
   */
  async updateUserSeasonPoints(
    seasonId: string,
    userId: string,
    data: Partial<SeasonUserPoints>
  ): Promise<void> {
    const ref = db.doc(`seasonUserPoints/${seasonId}/users/${userId}`);
    const safeUpdate = SeasonUserPointsUpdateSchema.parse(data);
    await ref.set({ ...safeUpdate }, { merge: true });
  }

  /**
   * Finds an available group or creates a new one, then adds the user via transaction.
   * @param {object} params - seasonId, leagueNumber, userId, points.
   * @return {Promise<string>} The group ID the user was assigned to.
   */
  async assignUserToGroup(params: {
    seasonId: string;
    leagueNumber: number;
    userId: string;
    points: number;
  }): Promise<string> {
    const { seasonId, leagueNumber, userId, points } = params;

    const groupsRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups");

    const allGroupsSnapshot = await groupsRef.get();
    let targetGroupId: string | null = null;

    for (const groupDoc of allGroupsSnapshot.docs) {
      const validatedGroup = LeagueGroupSchema.omit({ id: true }).parse(
        groupDoc.data()
      );
      const currentCount = validatedGroup.currentCount ?? 0;
      const capacity = validatedGroup.capacity ?? 20;
      const isFull = validatedGroup.isFull ?? false;

      if (!isFull && currentCount < capacity) {
        targetGroupId = groupDoc.id;
        break;
      }
    }

    if (!targetGroupId) {
      const newGroupRef = groupsRef.doc();
      targetGroupId = newGroupRef.id;

      const leagueGroupData: Omit<LeagueGroup, "createdAt" | "id"> = {
        isFull: false,
        capacity: 20,
        currentCount: 0,
        leagueNumber,
      };
      LeagueGroupSchema.omit({ createdAt: true, id: true }).parse(
        leagueGroupData
      );
      await newGroupRef.set({
        ...leagueGroupData,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // targetGroupId is guaranteed non-null here (found in loop or just created)
    if (targetGroupId === null) {
      throw new HttpsError("internal", "Failed to initialize group");
    }
    const groupId: string = targetGroupId;

    const userSeasonPointsRef = db.doc(
      `seasonUserPoints/${seasonId}/users/${userId}`
    );
    const memberRef = db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId);

    await db.runTransaction(async (trx) => {
      const groupDoc = await trx.get(
        db
          .collection("leagueGroups")
          .doc(`${seasonId}_${leagueNumber}`)
          .collection("groups")
          .doc(groupId)
      );

      const validatedGroup = LeagueGroupSchema.omit({ id: true }).parse(
        groupDoc.data()
      );
      const currentCount = validatedGroup.currentCount ?? 0;
      const capacity = validatedGroup.capacity ?? 20;

      if (currentCount >= capacity) {
        throw new HttpsError("failed-precondition", "Group is full");
      }
      if (points < 0) {
        throw new HttpsError("invalid-argument", "Points cannot be negative");
      }

      trx.set(memberRef, {
        userId,
        points,
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      const safeGroupUpdate = LeagueGroupUpdateSchema.parse({
        currentCount: currentCount + 1,
        isFull: currentCount + 1 >= capacity,
      });
      trx.update(groupDoc.ref, safeGroupUpdate);

      const safeSeasonAssignUpdate = SeasonUserPointsAssignUpdateSchema.parse({
        groupId,
        league: leagueNumber,
        points,
      });
      trx.set(
        userSeasonPointsRef,
        {
          ...safeSeasonAssignUpdate,
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const safeUserAssignUpdate = UserLeagueAssignUpdateSchema.parse({
        currentGroupId: groupId,
        league: leagueNumber,
      });
      trx.update(db.doc(`users/${userId}`), safeUserAssignUpdate);
    });

    return groupId;
  }
}
