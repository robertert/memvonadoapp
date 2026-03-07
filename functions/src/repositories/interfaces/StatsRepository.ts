import type { DailyStats } from "memvocado-types";

export interface StatsRepository {
  /** Get the deck-level daily stats embedded in the user's deck document, or null */
  getDeckDailyStats(userId: string, deckId: string): Promise<DailyStats | null>;

  /** Overwrite the deck-level daily stats */
  setDeckDailyStats(
    userId: string,
    deckId: string,
    stats: DailyStats
  ): Promise<void>;

  /**
   * Atomic batch-update of both the deck-level dailyStats and the user-level
   * dailyStats.  Computes the diff of completedNewToday / completedDueToday
   * between previousDeckStats and newDeckStats, and increments the user
   * document accordingly.
   *
   * @param previousDeckStats - The stats stored in Firestore before this review
   *                            (null if stats have never been written today).
   */
  updateDailyStats(
    userId: string,
    deckId: string,
    newDeckStats: DailyStats,
    previousDeckStats: DailyStats | null
  ): Promise<void>;
}
