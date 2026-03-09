import type { GetCurrentSeasonResponse } from "memvocado-types";
import type { SeasonUserPoints } from "memvocado-types";

export interface SeasonRepository {
  /** Get the current season, or null if none exists */
  getCurrentSeason(): Promise<GetCurrentSeasonResponse | null>;

  /** Get the current season, initializing a new weekly window if none exists */
  getOrInitializeSeason(): Promise<GetCurrentSeasonResponse>;

  /** Get a user's points doc for the season, or null */
  getUserSeasonPoints(
    seasonId: string,
    userId: string
  ): Promise<SeasonUserPoints | null>;

  /**
   * Atomically add delta points for a user in the given season.
   * Assigns the user to a league group if not already assigned.
   */
  submitPoints(params: {
    userId: string;
    delta: number;
    seasonId: string;
    userLeague: number;
  }): Promise<void>;

  /** Write a leaderboard snapshot for the season */
  publishLeaderboardSnapshot(seasonId: string): Promise<void>;

  /**
   * Rotate to the next season window.
   * @returns The new seasonId
   */
  rollOverSeason(currentSeasonId: string, currentEndAt: Date): Promise<string>;
}
