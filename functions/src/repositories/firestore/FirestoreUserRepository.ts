import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  UserSchema,
  UserSettingsSchema,
  StudySessionCreateSchema,
  DeckLearningDataSchema,
  type User,
  type UserSettings,
  type StudySessionCreate,
  type DeckLearningData,
} from "memvocado-types";
import { formatYmdInTimeZone } from "../../utils/dateUtils";
import * as logger from "firebase-functions/logger";
import type { UserRepository } from "../interfaces/UserRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of UserRepository.
 */
export class FirestoreUserRepository implements UserRepository {
  async getUser(userId: string): Promise<User | null> {
    const snap = await db.doc(`users/${userId}`).get();
    if (!snap.exists) {
      return null;
    }
    return UserSchema.parse({ id: snap.id, ...snap.data() });
  }

  async createUser(userId: string, user: User): Promise<void> {
    await db.doc(`users/${userId}`).set(user);
  }

  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}`).update(data);
  }

  async incrementField(
    userId: string,
    field: string,
    amount: number
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      [field]: FieldValue.increment(amount),
    });
  }

  async addStudySession(
    userId: string,
    session: StudySessionCreate
  ): Promise<string> {
    const validated = StudySessionCreateSchema.parse(session);
    const doc = await db
      .collection(`users/${userId}/studySessions`)
      .add(validated);
    return doc.id;
  }

  async deleteLatestStudySession(userId: string, cardId: string): Promise<void> {
    const snap = await db
      .collection(`users/${userId}/studySessions`)
      .where("cardId", "==", cardId)
      .limit(1)
      .get();
    if (snap.docs.length > 0) {
      await snap.docs[0].ref.delete();
    }
  }

  async listUserDecks(userId: string): Promise<DeckLearningData[]> {
    const snap = await db.collection(`users/${userId}/decks`).get();
    return snap.docs.map(doc =>
      DeckLearningDataSchema.parse({ id: doc.id, ...doc.data() })
    );
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const snap = await db
      .collection("users")
      .where("username", "==", username)
      .get();
    if (snap.empty) return false;
    if (excludeUserId) {
      return snap.docs.some((doc) => doc.id !== excludeUserId);
    }
    return true;
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const settingsSnap = await db.doc(`users/${userId}/settings/app`).get();
    if (settingsSnap.exists) {
      return UserSettingsSchema.parse(settingsSnap.data() || {});
    }

    const userSnap = await db.doc(`users/${userId}`).get();
    if (!userSnap.exists) {
      return UserSettingsSchema.parse({});
    }

    const userData = UserSchema.parse({ id: userSnap.id, ...userSnap.data() });
    if (
      userData.settings &&
      typeof userData.settings === "object" &&
      Object.keys(userData.settings).length > 0
    ) {
      return UserSettingsSchema.parse(userData.settings);
    }

    return UserSettingsSchema.parse({});
  }

  async setUserSettings(userId: string, settings: UserSettings): Promise<void> {
    await db.doc(`users/${userId}/settings/app`).set(settings, { merge: true });
  }

  async getUserProgress(userId: string): Promise<{
    stats: Record<string, unknown>;
    recentSessions: unknown[];
    dailyGoal?: number;
  }> {
    const userSnap = await db.doc(`users/${userId}`).get();
    if (!userSnap.exists) {
      throw Object.assign(new Error("User not found"), { code: "not-found" as const });
    }
    const userData = UserSchema.parse(userSnap.data());

    const sessionsSnap = await db
      .collection(`users/${userId}/studySessions`)
      .orderBy("reviewTime", "desc")
      .limit(10)
      .get();

    const recentSessions = sessionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      stats: (userData.stats || {}) as Record<string, unknown>,
      recentSessions,
      dailyGoal: userData.settings?.dailyGoal,
    };
  }

  async archiveDailyStatsIfNeeded(
    userId: string,
    dailyStats: {
      completedNewToday?: number;
      completedDueToday?: number;
      lastUpdatedStats?: unknown;
    } | null | undefined,
    timeZone: string
  ): Promise<string | null> {
    if (!dailyStats?.lastUpdatedStats) return null;

    const lastUpdated = dailyStats.lastUpdatedStats as { seconds?: number };
    const statsDate = lastUpdated.seconds
      ? new Date(lastUpdated.seconds * 1000)
      : dailyStats.lastUpdatedStats as Date;

    const statsYmd = formatYmdInTimeZone(statsDate, timeZone);
    const todayYmd = formatYmdInTimeZone(new Date(), timeZone);

    if (statsYmd === todayYmd) return null;

    const totalCards =
      (dailyStats.completedNewToday || 0) + (dailyStats.completedDueToday || 0);
    if (totalCards === 0) return null;

    const historyRef = db.doc(`users/${userId}/historyDailyStats/${statsYmd}`);
    const userRef = db.doc(`users/${userId}`);

    await Promise.all([
      historyRef.set(
        {
          date: statsYmd,
          completedNewToday: dailyStats.completedNewToday || 0,
          completedDueToday: dailyStats.completedDueToday || 0,
          totalCards,
          archivedAt: new Date(),
        },
        { merge: true }
      ),
      userRef.update({
        "dailyStats.completedNewToday": 0,
        "dailyStats.completedDueToday": 0,
        "dailyStats.lastUpdatedStats": new Date(),
      }),
    ]);

    logger.info("Archived daily stats", { userId, date: statsYmd, totalCards });
    return statsYmd;
  }

  async incrementAllInOneStats(userId: string, amount: 1 | -1): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "stats.totalReviews": FieldValue.increment(amount),
      "dailyStats.completedNewToday": FieldValue.increment(amount),
    });
  }

  async getActivityHeatmap(
    userId: string,
    startYmd: string
  ): Promise<Record<string, number>> {
    const snap = await db
      .collection(`users/${userId}/historyDailyStats`)
      .where("date", ">=", startYmd)
      .get();

    const activityMap: Record<string, number> = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      activityMap[data.date] =
        data.totalCards ||
        (data.completedNewToday || 0) + (data.completedDueToday || 0);
    });
    return activityMap;
  }

  async getUserAwards(userId: string): Promise<Array<Record<string, unknown>>> {
    const snap = await db
      .collection(`users/${userId}/awards`)
      .orderBy("earnedAt", "desc")
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async isFollowing(callerId: string, targetUserId: string): Promise<boolean> {
    const snap = await db
      .doc(`users/${callerId}/following/${targetUserId}`)
      .get();
    return snap.exists;
  }

  async toggleFollow(
    callerId: string,
    targetUserId: string
  ): Promise<{ isFollowing: boolean }> {
    const followRef = db.doc(`users/${callerId}/following/${targetUserId}`);
    const followerRef = db.doc(`users/${targetUserId}/followers/${callerId}`);
    const followSnap = await followRef.get();

    const batch = db.batch();

    if (followSnap.exists) {
      batch.delete(followRef);
      batch.delete(followerRef);
      batch.update(db.doc(`users/${callerId}`), {
        followingCount: FieldValue.increment(-1),
      });
      batch.update(db.doc(`users/${targetUserId}`), {
        followersCount: FieldValue.increment(-1),
      });
      await batch.commit();
      return { isFollowing: false };
    }

    const now = new Date();
    batch.set(followRef, { followedAt: now });
    batch.set(followerRef, { followedAt: now });
    batch.update(db.doc(`users/${callerId}`), {
      followingCount: FieldValue.increment(1),
    });
    batch.update(db.doc(`users/${targetUserId}`), {
      followersCount: FieldValue.increment(1),
    });
    await batch.commit();
    return { isFollowing: true };
  }

  async findByUsername(username: string): Promise<string | null> {
    const snap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].id;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const snap = await db.doc(`admin/roles/admins/${userId}`).get();
    return snap.exists;
  }

  async getStreakThreshold(): Promise<number> {
    const snap = await db.doc("admin/settings").get();
    return (snap.data()?.streakThreshold ?? 50) as number;
  }
}
