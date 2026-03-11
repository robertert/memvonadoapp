import type { GetCurrentSeasonResponse } from "memvocado-types";
import type { SeasonRepository } from "../repositories/interfaces/SeasonRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";

/**
 * Service for managing seasons and leaderboard rankings.
 * @class
 */
export class SeasonService {
  /**
   * @param {SeasonRepository} seasonRepo - Season repository
   * @param {UserRepository} userRepo - User repository
   */
  constructor(
    private readonly seasonRepo: SeasonRepository,
    private readonly userRepo: UserRepository
  ) {}

  /**
   * @return {Promise<GetCurrentSeasonResponse>} Current or newly initialized season
   */
  async getOrInitializeSeason(): Promise<GetCurrentSeasonResponse> {
    return this.seasonRepo.getOrInitializeSeason();
  }

  /**
   * @param {string} userId - User ID
   * @param {number} delta - Points to add
   * @return {Promise<void>}
   */
  async submitPoints(userId: string, delta: number): Promise<void> {
    const season = await this.seasonRepo.getOrInitializeSeason();
    const user = await this.userRepo.getUser(userId);
    const userLeague =
      typeof user?.league === "number" ? user.league : 1;

    await this.seasonRepo.submitPoints({
      userId,
      delta,
      seasonId: season.seasonId,
      userLeague,
    });
  }

  /**
   * @return {Promise<{ nextSeasonId: string }>} New season ID after roll-over
   */
  async rollOverSeason(): Promise<{ nextSeasonId: string }> {
    const current = await this.seasonRepo.getCurrentSeason();
    if (!current) {
      throw Object.assign(new Error("No current season"), {
        code: "failed-precondition" as const,
      });
    }

    await this.seasonRepo.publishLeaderboardSnapshot(current.seasonId);
    const nextSeasonId = await this.seasonRepo.rollOverSeason(
      current.seasonId,
      current.endAt
    );
    return { nextSeasonId };
  }
}
