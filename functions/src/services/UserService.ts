import * as logger from "firebase-functions/logger";
import type { UserSettings, User } from "memvocado-types";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async archiveDailyStatsIfNeeded(userId: string): Promise<string | null> {
    const user = await this.userRepo.getUser(userId);
    if (!user) return null;
    const tz = user.settings?.timeZone ?? "UTC";
    return this.userRepo.archiveDailyStatsIfNeeded(userId, user.dailyStats ?? null, tz);
  }

  async updateAllInOneStats(userId: string, isIncrement: boolean): Promise<void> {
    const amount = isIncrement ? (1 as const) : (-1 as const);
    await this.userRepo.incrementAllInOneStats(userId, amount);
  }

  async getUserProgress(userId: string): Promise<{
    stats: Record<string, unknown>;
    recentSessions: unknown[];
    dailyGoal?: number;
  }> {
    return this.userRepo.getUserProgress(userId);
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    return this.userRepo.getUserSettings(userId);
  }

  async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    await this.userRepo.setUserSettings(userId, settings);
    logger.info("User settings updated", { userId });
  }

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

  async getUserAwards(userId: string): Promise<Array<Record<string, unknown>>> {
    return this.userRepo.getUserAwards(userId);
  }

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

  async isAdmin(userId: string): Promise<boolean> {
    return this.userRepo.isAdmin(userId);
  }

  async findByUsername(username: string): Promise<string | null> {
    const normalized = username.trim().toLowerCase();
    return this.userRepo.findByUsername(normalized);
  }

  async getStreakThreshold(): Promise<number> {
    return this.userRepo.getStreakThreshold();
  }
}
