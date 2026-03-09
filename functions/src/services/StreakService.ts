import type { UserRepository } from "../repositories/interfaces/UserRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

export interface StreakQualifyResult {
  qualified: boolean;
  updated: boolean;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  threshold: number;
  todayCount: number;
  timeZone: string;
}

export interface StreakLoginResult {
  updated: boolean;
  currentStreak: number;
  previousStreak?: number;
  longestStreak?: number;
  lastStreakDate: string | null;
  status: "streak_safe" | "streak_reset";
}

/**
 * Business logic for streak updates.
 * Depends only on repository interfaces — no Firebase imports.
 */
export class StreakService {
  /**
   * @param {UserRepository} userRepo - User repository
   */
  constructor(protected readonly userRepo: UserRepository) {}

  /**
   * Update user streak if they have met the daily threshold today.
   * Idempotent — no-op if streak is already recorded for today.
   * @param {string} userId - User ID
   * @param {number} [threshold] - Daily card threshold (default 10)
   * @return {Promise<StreakQualifyResult>}
   */
  async updateStreakIfQualified(
    userId: string,
    threshold?: number
  ): Promise<StreakQualifyResult> {
    const dailyThreshold =
      typeof threshold === "number" && threshold > 0 ? threshold : 10;

    const user = await this.userRepo.getUser(userId);
    if (!user) throw new Error("User not found");

    const tz = user.settings?.timeZone ?? "UTC";
    const now = new Date();
    const todayYmd = formatYmdInTimeZone(now, tz);

    const lastStreakDate = user.stats?.lastStreakDate;
    const lastStreakYmd = lastStreakDate
      ? formatYmdInTimeZone(lastStreakDate, tz)
      : null;

    const currentStreak = Number(user.stats?.currentStreak || 0);
    const longestStreak = Number(user.stats?.longestStreak || 0);

    const dailyStats = user.dailyStats;
    const todayCount =
      (dailyStats?.completedNewToday ?? 0) +
      (dailyStats?.completedDueToday ?? 0);

    if (lastStreakYmd === todayYmd) {
      return {
        qualified: true,
        updated: false,
        currentStreak,
        longestStreak,
        lastStreakDate: lastStreakYmd,
        threshold: dailyThreshold,
        todayCount,
        timeZone: tz,
      };
    }

    if (todayCount < dailyThreshold) {
      return {
        qualified: false,
        updated: false,
        currentStreak,
        longestStreak,
        lastStreakDate: lastStreakYmd,
        threshold: dailyThreshold,
        todayCount,
        timeZone: tz,
      };
    }

    const nextCurrent = currentStreak + 1;
    const nextLongest = Math.max(longestStreak, nextCurrent);

    await this.userRepo.updateUser(userId, {
      "stats.currentStreak": nextCurrent,
      "stats.longestStreak": nextLongest,
      "stats.lastStreakDate": now,
    });

    return {
      qualified: true,
      updated: true,
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastStreakDate: todayYmd,
      threshold: dailyThreshold,
      todayCount,
      timeZone: tz,
    };
  }

  /**
   * Update streak on login — resets broken streak if last activity was
   * more than one day ago.
   * @param {string} userId - User ID
   * @return {Promise<StreakLoginResult>}
   */
  async updateStreakOnLogin(userId: string): Promise<StreakLoginResult> {
    const user = await this.userRepo.getUser(userId);
    if (!user) throw new Error("User not found");

    const tz = user.settings?.timeZone ?? "UTC";
    const now = new Date();
    const todayYmd = formatYmdInTimeZone(now, tz);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYmd = formatYmdInTimeZone(yesterday, tz);

    const lastStreakDate = user.stats?.lastStreakDate;
    const lastStreakYmd = lastStreakDate
      ? formatYmdInTimeZone(lastStreakDate, tz)
      : null;

    const currentStreak = Number(user.stats?.currentStreak || 0);
    const longestStreak = Number(user.stats?.longestStreak || 0);

    if (lastStreakYmd === todayYmd || lastStreakYmd === yesterdayYmd) {
      return {
        updated: false,
        currentStreak,
        longestStreak,
        lastStreakDate: lastStreakYmd,
        status: "streak_safe",
      };
    }

    if (!user.stats?.currentStreak) {
      return {
        updated: false,
        currentStreak: 0,
        longestStreak,
        lastStreakDate: lastStreakYmd,
        status: "streak_safe",
      };
    }

    await this.userRepo.updateUser(userId, { "stats.currentStreak": 0 });

    return {
      updated: true,
      currentStreak: 0,
      previousStreak: currentStreak,
      longestStreak,
      lastStreakDate: lastStreakYmd,
      status: "streak_reset",
    };
  }
}
