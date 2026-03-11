import * as logger from "firebase-functions/logger";
import type { UserSettings, User } from "memvocado-types";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

/**
 * Service for user profile and settings management.
 * @class
 */
export class UserService {
  /**
   * @param {UserRepository} userRepo - User repository
   */
  constructor(private readonly userRepo: UserRepository) {}

  /**
   * @param {string} userId - User ID
   * @return {Promise<string | null>} Archived date string or null
   */
  async archiveDailyStatsIfNeeded(userId: string): Promise<string | null> {
    const user = await this.userRepo.getUser(userId);
    if (!user) return null;
    const tz = user.settings?.timeZone ?? "UTC";
    return this.userRepo.archiveDailyStatsIfNeeded(userId, user.dailyStats ?? null, tz);
  }

  /**
   * @param {string} userId - User ID
   * @param {boolean} isIncrement - True to increment, false to decrement
   * @return {Promise<void>}
   */
  async updateAllInOneStats(userId: string, isIncrement: boolean): Promise<void> {
    const amount = isIncrement ? (1 as const) : (-1 as const);
    await this.userRepo.incrementAllInOneStats(userId, amount);
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
    return this.userRepo.getUserProgress(userId);
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<UserSettings>} User settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    return this.userRepo.getUserSettings(userId);
  }

  /**
   * @param {string} userId - User ID
   * @param {UserSettings} settings - Settings to save
   * @return {Promise<void>}
   */
  async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    await this.userRepo.setUserSettings(userId, settings);
    logger.info("User settings updated", { userId });
  }

  /**
   * @param {string} userId - User ID
   * @param {number} weeks - Number of weeks to include
   * @return {Promise<Array<*>>} Activity heatmap data
   */
  async getActivityHeatmap(
    userId: string,
    weeks: number
  ): Promise<Array<{ date: string; count: number }>> {
    const today = new Date();
    const days = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const startYmd = startDate.toISOString().slice(0, 10);

    const activityMap = await this.userRepo.getActivityHeatmap(userId, startYmd);

    // Merge live today stats (not yet archived)
    const user = await this.userRepo.getUser(userId);
    if (user) {
      const tz = (user as unknown as { settings?: { timeZone?: string } }).settings?.timeZone || "UTC";
      const rawDailyStats = (user as unknown as { dailyStats?: { lastUpdatedStats?: unknown; completedNewToday?: number; completedDueToday?: number } }).dailyStats;
      if (rawDailyStats?.lastUpdatedStats) {
        const lastUpdated = rawDailyStats.lastUpdatedStats as {
          seconds?: number;
          toDate?: () => Date;
        };
        const statsDate =
          lastUpdated.toDate?.() || new Date((lastUpdated.seconds || 0) * 1000);
        const todayYmd = formatYmdInTimeZone(new Date(), tz);
        const statsYmd = formatYmdInTimeZone(statsDate, tz);
        if (statsYmd === todayYmd) {
          activityMap[todayYmd] =
            (rawDailyStats.completedNewToday || 0) +
            (rawDailyStats.completedDueToday || 0);
        }
      }
    }

    // Build full date range array
    const heatmapData: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      dt.setHours(0, 0, 0, 0);
      const iso = dt.toISOString().slice(0, 10);
      heatmapData.push({ date: iso, count: activityMap[iso] || 0 });
    }
    return heatmapData;
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<Array<Record<string, unknown>>>} User awards
   */
  async getUserAwards(userId: string): Promise<Array<Record<string, unknown>>> {
    return this.userRepo.getUserAwards(userId);
  }

  /**
   * @param {string} callerId - Caller user ID
   * @param {string} targetUserId - Target user ID
   * @return {Promise<object>} Public profile and follow state
   */
  async getPublicUserProfile(
    callerId: string,
    targetUserId: string
  ): Promise<{ user: User; isFollowing: boolean }> {
    const user = await this.userRepo.getUser(targetUserId);
    if (!user) {
      throw Object.assign(new Error("User not found"), { code: "not-found" as const });
    }
    const isFollowing = await this.userRepo.isFollowing(callerId, targetUserId);
    return { user, isFollowing };
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
    const target = await this.userRepo.getUser(targetUserId);
    if (!target) {
      throw Object.assign(new Error("User not found"), { code: "not-found" as const });
    }
    return this.userRepo.toggleFollow(callerId, targetUserId);
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<boolean>} True if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.userRepo.isAdmin(userId);
  }

  /**
   * @param {string} username - Username to look up
   * @return {Promise<string | null>} User ID or null
   */
  async findByUsername(username: string): Promise<string | null> {
    const normalized = username.trim().toLowerCase();
    return this.userRepo.findByUsername(normalized);
  }

  /**
   * @return {Promise<number>} Streak threshold value
   */
  async getStreakThreshold(): Promise<number> {
    return this.userRepo.getStreakThreshold();
  }
}
