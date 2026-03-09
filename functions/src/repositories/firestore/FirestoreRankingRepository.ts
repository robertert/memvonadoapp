import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  LeagueGroupSchema,
  SeasonUserPointsSchema,
  UserSchema,
  FollowingArraySchema,
  GetCurrentSeasonResponseSchema,
  type LeagueGroup,
  type SeasonUserPoints,
  type User,
} from "../../types/common";
import type { Following } from "memvocado-types";
import type { RankingRepository, GroupMember } from "../interfaces/RankingRepository";

const db = getFirestore();

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
 * Firestore-backed implementation of RankingRepository.
 */
export class FirestoreRankingRepository implements RankingRepository {
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
   * @param {string} seasonId - Season ID.
   * @param {number} leagueNumber - League number.
   * @param {string} groupId - Group ID.
   * @return {Promise<GroupMember[]>} Members sorted by points descending.
   */
  async getGroupMembers(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<GroupMember[]> {
    const membersSnapshot = await db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .orderBy("points", "desc")
      .get();

    return membersSnapshot.docs.map((doc) => {
      const data = doc.data() as {
        userId: string;
        points?: number;
        lastActivityAt?: FirebaseFirestore.Timestamp | null;
      };
      return {
        userId: data.userId,
        points: data.points ?? 0,
        lastActivityAt: data.lastActivityAt?.toDate() ?? null,
      };
    });
  }

  /**
   * @param {string} seasonId - Season ID.
   * @param {number} leagueNumber - League number.
   * @param {string} groupId - Group ID.
   * @return {Promise<number>} Total member count.
   */
  async getGroupSize(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<number> {
    const snap = await db
      .collection("leagueGroups")
      .doc(`${seasonId}_${leagueNumber}`)
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();
    return snap.size;
  }

  /**
   * @param {string} userId - User ID.
   * @return {Promise<Following[]>} List of followed users.
   */
  async getFollowing(userId: string): Promise<Following[]> {
    const snap = await db.collection(`users/${userId}/following`).get();
    if (snap.empty) return [];
    return FollowingArraySchema.parse(snap.docs.map((doc) => doc.data()));
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
      const groupDataWithId = { ...groupDoc.data(), id: groupDoc.id };
      const validatedGroup = LeagueGroupSchema.parse(groupDataWithId);
      const currentCount = validatedGroup.currentCount ?? 0;
      const capacity = validatedGroup.capacity ?? 20;

      if (!validatedGroup.isFull && currentCount < capacity) {
        targetGroupId = groupDoc.id;
        break;
      }
    }

    if (!targetGroupId) {
      const newGroupRef = groupsRef.doc();
      targetGroupId = newGroupRef.id;

      const leagueGroupData: LeagueGroup = {
        id: targetGroupId,
        isFull: false,
        capacity: 20,
        currentCount: 0,
        leagueNumber,
        createdAt: new Date(),
      };
      LeagueGroupSchema.parse(leagueGroupData);
      await newGroupRef.set({ ...leagueGroupData });
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

      const groupDataWithId = { ...groupDoc.data(), id: groupDoc.id };
      const validatedGroup = LeagueGroupSchema.parse(groupDataWithId);
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

      const safeSeasonUpdate = SeasonUserPointsAssignUpdateSchema.parse({
        groupId,
        league: leagueNumber,
        points,
      });
      trx.set(
        userSeasonPointsRef,
        { ...safeSeasonUpdate, lastActivityAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      const safeUserUpdate = UserLeagueAssignUpdateSchema.parse({
        currentGroupId: groupId,
        league: leagueNumber,
      });
      trx.update(db.doc(`users/${userId}`), safeUserUpdate);
    });

    return groupId;
  }
}
