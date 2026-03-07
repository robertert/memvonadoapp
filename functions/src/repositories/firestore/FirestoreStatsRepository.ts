import type { DailyStats } from "memvocado-types";
import type { StatsRepository } from "../interfaces/StatsRepository";

/**
 * Firestore-backed implementation of StatsRepository.
 * Methods are populated in Phase 2 (extract Local functions).
 */
export class FirestoreStatsRepository implements StatsRepository {
  async getDeckDailyStats(
    _userId: string,
    _deckId: string
  ): Promise<DailyStats | null> {
    throw new Error("Not implemented — Phase 2");
  }

  async setDeckDailyStats(
    _userId: string,
    _deckId: string,
    _stats: DailyStats
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async updateDailyStats(
    _userId: string,
    _deckId: string,
    _newDeckStats: DailyStats,
    _previousDeckStats: DailyStats | null
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }
}
