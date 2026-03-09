import type { SeasonUserPoints, User, LeagueGroup } from "memvocado-types";

export interface LeagueRepository {
  getCurrentSeasonId(seasonId?: string): Promise<string>;
  getUserSeasonPoints(seasonId: string, userId: string): Promise<SeasonUserPoints | null>;
  getUserById(userId: string): Promise<User | null>;
  getGroupById(seasonId: string, leagueNumber: number, groupId: string): Promise<LeagueGroup | null>;
  /**
   * Removes user from the group members collection, decrements group count,
   * and clears the user's groupId in seasonUserPoints.
   */
  removeUserFromGroup(
    seasonId: string,
    leagueNumber: number,
    groupId: string,
    userId: string
  ): Promise<void>;
  updateUserLeagueDoc(userId: string, league: number): Promise<void>;
  updateUserSeasonPoints(
    seasonId: string,
    userId: string,
    data: Partial<SeasonUserPoints>
  ): Promise<void>;
  assignUserToGroup(params: {
    seasonId: string;
    leagueNumber: number;
    userId: string;
    points: number;
  }): Promise<string>;
}
