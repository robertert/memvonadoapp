import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  UserSchema,
  UserSettingsSchema,
  StudySessionCreateSchema,
  DeckLearningDataSchema,
  NotificationCreateSchema,
  SearchLogSchema,
  type User,
  type UserSettings,
  type StudySessionCreate,
  type DeckLearningData,
  type NotificationCreate,
  type SearchLog,
} from "memvocado-types";
import { formatYmdInTimeZone } from "../../utils/dateUtils";
import * as logger from "firebase-functions/logger";
import type { UserRepository } from "../interfaces/UserRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of UserRepository.
 */
export class FirestoreUserRepository implements UserRepository {
  /**
   * @param {string} userId - User ID
   * @return {Promise<User | null>} User or null
   */
  async getUser(userId: string): Promise<User | null> {
    const snap = await db.doc(`users/${userId}`).get();
    if (!snap.exists) {
      return null;
    }
    return UserSchema.parse({ id: snap.id, ...snap.data() });
  }

  /**
   * @param {string} userId - User ID
   * @param {User} user - User data to create
   * @return {Promise<void>}
   */
  async createUser(userId: string, user: User): Promise<void> {
    await db.doc(`users/${userId}`).set(user);
  }

  /**
   * @param {string} userId - User ID
   * @param {Record<string, unknown>} data - Fields to update
   * @return {Promise<void>}
   */
  async updateUser(
    userId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}`).update(data);
  }

  /**
   * @param {string} userId - User ID
   * @param {string} field - Dot-notation field path
   * @param {number} amount - Increment amount
   * @return {Promise<void>}
   */
  async incrementField(
    userId: string,
    field: string,
    amount: number
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      [field]: FieldValue.increment(amount),
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {StudySessionCreate} session - Study session data
   * @return {Promise<string>} ID of the created session
   */
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

  /**
   * @param {string} userId - User ID
   * @param {string} cardId - Card ID whose latest session to delete
   * @return {Promise<void>}
   */
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

  /**
   * @param {string} userId - User ID
   * @return {Promise<DeckLearningData[]>} All user deck copies
   */
  async listUserDecks(userId: string): Promise<DeckLearningData[]> {
    const snap = await db.collection(`users/${userId}/decks`).get();
    const decks = snap.docs.map((doc) =>
      DeckLearningDataSchema.parse({ id: doc.id, ...doc.data() })
    );
    return decks.sort((a, b) => {
      const aTime = a.lastReviewDate?.getTime() ?? 0;
      const bTime = b.lastReviewDate?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  /**
   * @param {string} username - Username to check
   * @param {string} [excludeUserId] - User ID to exclude from the check
   * @return {Promise<boolean>} True if username is taken
   */
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

  /**
   * @param {string} userId - User ID
   * @return {Promise<UserSettings>} User settings
   */
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

  /**
   * @param {string} userId - User ID
   * @param {UserSettings} settings - Settings to save
   * @return {Promise<void>}
   */
  async setUserSettings(userId: string, settings: UserSettings): Promise<void> {
    await db.doc(`users/${userId}/settings/app`).set(settings, { merge: true });
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<object>} User progress data
   */
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

    const recentSessions = sessionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      stats: (userData.stats || {}) as Record<string, unknown>,
      recentSessions,
      dailyGoal: userData.settings?.dailyGoal,
    };
  }

  /**
   * @param {string} userId - User ID
   * @param {object | null | undefined} dailyStats - Current daily stats
   * @param {string} timeZone - User's time zone
   * @return {Promise<string | null>} Archived date string or null
   */
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

  /**
   * @param {string} userId - User ID
   * @param {1 | -1} amount - Increment or decrement amount
   * @return {Promise<void>}
   */
  async incrementAllInOneStats(userId: string, amount: 1 | -1): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "stats.totalReviews": FieldValue.increment(amount),
      "dailyStats.completedNewToday": FieldValue.increment(amount),
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} startYmd - Start date (YYYY-MM-DD)
   * @return {Promise<Record<string, number>>} Map of date to card count
   */
  async getActivityHeatmap(
    userId: string,
    startYmd: string
  ): Promise<Record<string, number>> {
    const snap = await db
      .collection(`users/${userId}/historyDailyStats`)
      .where("date", ">=", startYmd)
      .get();

    const activityMap: Record<string, number> = {};
    snap.docs.forEach((doc) => {
      const data = doc.data();
      activityMap[data.date] =
        data.totalCards ||
        (data.completedNewToday || 0) + (data.completedDueToday || 0);
    });
    return activityMap;
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<Array<Record<string, unknown>>>} User awards
   */
  async getUserAwards(userId: string): Promise<Array<Record<string, unknown>>> {
    const snap = await db
      .collection(`users/${userId}/awards`)
      .orderBy("earnedAt", "desc")
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * @param {string} callerId - Caller user ID
   * @param {string} targetUserId - Target user ID
   * @return {Promise<boolean>} True if callerId follows targetUserId
   */
  async isFollowing(callerId: string, targetUserId: string): Promise<boolean> {
    const snap = await db
      .doc(`users/${callerId}/following/${targetUserId}`)
      .get();
    return snap.exists;
  }

  /**
   * @param {string} callerId - Caller user ID
   * @param {string} targetUserId - Target user ID
   * @return {Promise<{ isFollowing: boolean }>} New follow state
   */
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

  /**
   * @param {string} username - Username to look up
   * @return {Promise<string | null>} User ID or null
   */
  async findByUsername(username: string): Promise<string | null> {
    const snap = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].id;
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<boolean>} True if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const snap = await db.doc(`admin/roles/admins/${userId}`).get();
    return snap.exists;
  }

  /**
   * @return {Promise<number>} Streak threshold value
   */
  async getStreakThreshold(): Promise<number> {
    const snap = await db.doc("admin/settings").get();
    return (snap.data()?.streakThreshold ?? 50) as number;
  }

  /**
   * @param {string} targetUserId - Recipient user ID
   * @param {NotificationCreate} notification - Notification data
   * @return {Promise<string>} ID of the created notification
   */
  async writeNotification(
    targetUserId: string,
    notification: NotificationCreate
  ): Promise<string> {
    const validated = NotificationCreateSchema.parse(notification);
    const doc = await db
      .collection(`users/${targetUserId}/notifications`)
      .add(validated);
    return doc.id;
  }

  /**
   * @param {string} userId - User ID
   * @param {Omit<SearchLog, "id">} log - Search log entry
   * @return {Promise<void>}
   */
  async addSearchLog(userId: string, log: Omit<SearchLog, "id">): Promise<void> {
    SearchLogSchema.omit({ id: true }).parse(log);
    await db.collection(`users/${userId}/searchLogs`).add(log);
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<SearchLog[]>} Search logs for the user
   */
  async getSearchLogs(userId: string): Promise<SearchLog[]> {
    const snap = await db
      .collection(`users/${userId}/searchLogs`)
      .orderBy("timestamp", "desc")
      .get();
    return snap.docs.map((doc) => SearchLogSchema.parse({ id: doc.id, ...doc.data() }));
  }
}
