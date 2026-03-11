import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  SeasonUserPointsSchema,
  LeagueGroupSchema,
  UserSchema,
  GetCurrentSeasonResponseSchema,
  type SeasonUserPoints,
  type LeagueGroup,
  type GetCurrentSeasonResponse,
} from "memvocado-types";
import * as logger from "firebase-functions/logger";
import type { SeasonRepository } from "../interfaces/SeasonRepository";

const db = getFirestore();

/**
 * Compute the current Monday-to-Sunday weekly window and derive a seasonId.
 * @return {object} Season window with seasonId, startAt, endAt, and status
 */
function computeWindow(): {
  seasonId: string;
  startAt: Date;
  endAt: Date;
  status: "active";
} {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    )
  );
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  const seasonId = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
  return { seasonId, startAt: start, endAt: end, status: "active" };
}

const UserLeagueUpdateSchema = UserSchema.pick({
  league: true,
  currentGroupId: true,
}).partial();

/**
 * Firestore-backed implementation of SeasonRepository.
 * @class
 */
export class FirestoreSeasonRepository implements SeasonRepository {
  /**
   * @return {Promise<GetCurrentSeasonResponse | null>} Current season or null
   */
  async getCurrentSeason(): Promise<GetCurrentSeasonResponse | null> {
    const snap = await db.doc("ranking/currentSeason").get();
    if (!snap.exists) return null;
    return GetCurrentSeasonResponseSchema.parse(snap.data() || {});
  }

  /**
   * @return {Promise<GetCurrentSeasonResponse>} Current or newly initialized season
   */
  async getOrInitializeSeason(): Promise<GetCurrentSeasonResponse> {
    const seasonRef = db.doc("ranking/currentSeason");
    const snap = await seasonRef.get();

    if (!snap.exists) {
      const window = computeWindow();
      await seasonRef.set({
        ...window,
        createdAt: FieldValue.serverTimestamp(),
      });
      return GetCurrentSeasonResponseSchema.parse(window);
    }

    return GetCurrentSeasonResponseSchema.parse(snap.data() || {});
  }

  /**
   * @param {string} seasonId - Season ID
   * @param {string} userId - User ID
   * @return {Promise<SeasonUserPoints | null>} User season points or null
   */
  async getUserSeasonPoints(
    seasonId: string,
    userId: string
  ): Promise<SeasonUserPoints | null> {
    const snap = await db
      .doc(`seasonUserPoints/${seasonId}/users/${userId}`)
      .get();
    if (!snap.exists) return null;
    return SeasonUserPointsSchema.parse(snap.data() || {});
  }

  /**
   * @param {object} params - Points submission params
   * @return {Promise<void>}
   */
  async submitPoints(params: {
    userId: string;
    delta: number;
    seasonId: string;
    userLeague: number;
  }): Promise<void> {
    const { userId, delta, seasonId, userLeague } = params;

    const docRef = db.doc(`seasonUserPoints/${seasonId}/users/${userId}`);

    // Read current season doc to determine groupId before transaction
    const userSeasonSnap = await docRef.get();
    const seasonData = userSeasonSnap.exists
      ? SeasonUserPointsSchema.partial().parse(userSeasonSnap.data() || {})
      : {};

    let groupId = seasonData.groupId;

    // Assign to a league group if not yet assigned
    if (!groupId) {
      const groupsRef = db
        .collection("leagueGroups")
        .doc(`${seasonId}_${userLeague}`)
        .collection("groups");
      const allGroupsSnap = await groupsRef.get();

      let targetGroupId: string | null = null;

      for (const groupDoc of allGroupsSnap.docs) {
        const gd = groupDoc.data() as {
          currentCount?: number;
          isFull?: boolean;
          capacity?: number;
        };
        const currentCount = gd.currentCount ?? 0;
        const capacity = gd.capacity ?? 20;
        const isFull = gd.isFull ?? false;
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
          leagueNumber: userLeague,
        };
        LeagueGroupSchema.omit({ createdAt: true, id: true }).parse(leagueGroupData);

        await newGroupRef.set({
          ...leagueGroupData,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      groupId = targetGroupId;
    }

    // Atomic transaction: update points + group membership
    await db.runTransaction(async (trx) => {
      const snap = await trx.get(docRef);
      const prev = snap.exists
        ? SeasonUserPointsSchema.partial().parse(snap.data() || {})
        : {};
      const nextPoints = (prev.points || 0) + delta;

      let groupDoc = null;
      if (!prev.groupId && groupId) {
        const groupRef = db
          .collection("leagueGroups")
          .doc(`${seasonId}_${userLeague}`)
          .collection("groups")
          .doc(groupId);
        groupDoc = await trx.get(groupRef);
      }

      const seasonUserPointsData: Omit<SeasonUserPoints, "lastActivityAt"> = {
        points: nextPoints,
        league: userLeague,
        groupId,
      };
      SeasonUserPointsSchema.omit({ lastActivityAt: true }).parse(seasonUserPointsData);

      trx.set(
        docRef,
        { ...seasonUserPointsData, lastActivityAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      const safeUserLeagueUpdate = UserLeagueUpdateSchema.parse({
        currentGroupId: groupId,
        league: userLeague,
      });
      trx.update(db.doc(`users/${userId}`), safeUserLeagueUpdate);

      const memberRef = db
        .collection("leagueGroups")
        .doc(`${seasonId}_${userLeague}`)
        .collection("groups")
        .doc(groupId)
        .collection("members")
        .doc(userId);

      trx.set(
        memberRef,
        { userId, points: nextPoints, lastActivityAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      if (!prev.groupId && groupId && groupDoc?.exists) {
        const rawGroupData = groupDoc.data() || {};
        const currentCount = (rawGroupData as { currentCount?: number }).currentCount ?? 0;
        const capacity = (rawGroupData as { capacity?: number }).capacity ?? 20;
        const newCount = currentCount + 1;
        const groupRefForUpdate = db
          .collection("leagueGroups")
          .doc(`${seasonId}_${userLeague}`)
          .collection("groups")
          .doc(groupId);
        trx.update(groupRefForUpdate, {
          currentCount: newCount,
          isFull: newCount >= capacity,
        });
      }
    });

    logger.info("Points submitted", { userId, delta, seasonId, groupId });
  }

  /**
   * @param {string} seasonId - Season ID
   * @return {Promise<void>}
   */
  async publishLeaderboardSnapshot(seasonId: string): Promise<void> {
    const usersSnap = await db
      .collection(`seasonUserPoints/${seasonId}/users`)
      .orderBy("points", "desc")
      .limit(100)
      .get();

    const entries = usersSnap.docs.map((d, idx) => {
      const data = d.data() as { points?: number; lastActivityAt?: unknown };
      return {
        userId: d.id,
        points: data.points ?? 0,
        lastActivityAt: data.lastActivityAt ?? null,
        position: idx + 1,
      };
    });

    await db.doc(`leaderboards/${seasonId}/groups/global`).set(
      { entries, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  /**
   * @param {string} currentSeasonId - Current season ID
   * @param {Date} currentEndAt - End date of the current season
   * @return {Promise<string>} New season ID
   */
  async rollOverSeason(
    currentSeasonId: string,
    currentEndAt: Date
  ): Promise<string> {
    const nextStart = new Date(currentEndAt);
    const nextEnd = new Date(nextStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 7);
    const nextId = `${nextStart.toISOString().slice(0, 10)}_${nextEnd
      .toISOString()
      .slice(0, 10)}`;

    await db.doc("ranking/currentSeason").set(
      {
        seasonId: nextId,
        startAt: nextStart,
        endAt: nextEnd,
        status: "active",
        rolledAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("Season rolled over", { prev: currentSeasonId, next: nextId });
    return nextId;
  }
}
