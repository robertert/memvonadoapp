import type { UserRepository } from "../repositories/interfaces/UserRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

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
   * @return {Promise<void>}
   */
  async updateStreakIfQualified(
    userId: string,
    threshold?: number
  ): Promise<void> {
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

    if (lastStreakYmd === todayYmd) return;

    const dailyStats = user.dailyStats;
    const todayCount =
      (dailyStats?.completedNewToday ?? 0) +
      (dailyStats?.completedDueToday ?? 0);

    if (todayCount < dailyThreshold) return;

    const current = Number(user.stats?.currentStreak || 0);
    const longest = Number(user.stats?.longestStreak || 0);
    const nextCurrent = current + 1;
    const nextLongest = Math.max(longest, nextCurrent);

    await this.userRepo.updateUser(userId, {
      "stats.currentStreak": nextCurrent,
      "stats.longestStreak": nextLongest,
      "stats.lastStreakDate": now,
    });
  }

  /**
   * Update streak on login — resets broken streak if last activity was
   * more than one day ago.
   * @param {string} userId - User ID
   * @return {Promise<void>}
   */
  async updateStreakOnLogin(userId: string): Promise<void> {
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

    if (lastStreakYmd === todayYmd || lastStreakYmd === yesterdayYmd) return;

    if (!user.stats?.currentStreak) return;

    await this.userRepo.updateUser(userId, { "stats.currentStreak": 0 });
  }
}
