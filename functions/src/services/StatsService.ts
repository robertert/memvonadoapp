import type { UserDailyStats } from "memvocado-types";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";

/**
 * Business logic for daily stats and archiving.
 * Populated in Phase 3.
 */
export class StatsService {
  constructor(
    protected readonly statsRepo: StatsRepository,
    protected readonly userRepo: UserRepository
  ) {}

  /** Get deck-level daily stats, returning null if not yet written today */
  async getDeckDailyStatsToday(
    userId: string,
    deckId: string
  ): Promise<unknown> {
    void userId;
    void deckId;
    throw new Error("Not implemented — Phase 3");
  }

  /** Get user-level daily stats, returning null if not yet written today */
  async getUserDailyStatsToday(userId: string): Promise<UserDailyStats | null> {
    void userId;
    throw new Error("Not implemented — Phase 3");
  }
}
