import type { UserRepository } from "../repositories/interfaces/UserRepository";

/**
 * Business logic for streak updates and avocado growth.
 * Populated in Phase 3.
 */
export class StreakService {
  constructor(protected readonly userRepo: UserRepository) {}

  /**
   * Update user streak if they have met the daily threshold today.
   * Idempotent — no-op if streak is already recorded for today.
   */
  async updateStreakIfQualified(
    userId: string,
    threshold?: number
  ): Promise<void> {
    void userId;
    void threshold;
    throw new Error("Not implemented — Phase 3");
  }

  /** Update streak on login (resets broken streak if needed) */
  async updateStreakOnLogin(userId: string): Promise<void> {
    void userId;
    throw new Error("Not implemented — Phase 3");
  }
}
