import type { DailyStats, UserDailyStats } from "memvocado-types";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

/**
 * Business logic for daily stats retrieval.
 * Depends only on repository interfaces — no Firebase imports.
 */
export class StatsService {
  /**
   * @param {StatsRepository} statsRepo - Stats repository
   * @param {UserRepository} userRepo - User repository
   */
  constructor(
    protected readonly statsRepo: StatsRepository,
    protected readonly userRepo: UserRepository
  ) {}

  /**
   * Get deck-level daily stats, returning null if not yet written today.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<DailyStats | null>} Today's stats or null
   */
  async getDeckDailyStatsToday(
    userId: string,
    deckId: string
  ): Promise<DailyStats | null> {
    const stats = await this.statsRepo.getDeckDailyStats(userId, deckId);
    if (!stats?.lastUpdatedStats) return null;

    const user = await this.userRepo.getUser(userId);
    const timeZone = user?.settings?.timeZone ?? "UTC";

    const todayYmd = formatYmdInTimeZone(new Date(), timeZone);
    const statsYmd = formatYmdInTimeZone(stats.lastUpdatedStats, timeZone);

    return statsYmd === todayYmd ? stats : null;
  }

  /**
   * Get user-level daily stats, returning null if not yet written today.
   * @param {string} userId - User ID
   * @return {Promise<UserDailyStats | null>} Today's stats or null
   */
  async getUserDailyStatsToday(userId: string): Promise<UserDailyStats | null> {
    const user = await this.userRepo.getUser(userId);
    if (!user?.dailyStats) return null;

    const timeZone = user.settings?.timeZone ?? "UTC";
    const todayYmd = formatYmdInTimeZone(new Date(), timeZone);
    const statsYmd = formatYmdInTimeZone(
      user.dailyStats.lastUpdatedStats,
      timeZone
    );

    return statsYmd === todayYmd ? user.dailyStats : null;
  }
}
