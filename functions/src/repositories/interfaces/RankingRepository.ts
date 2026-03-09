import type { SeasonUserPoints, User, Following } from "memvocado-types";

export interface GroupMember {
  userId: string;
  points: number;
  lastActivityAt: Date | null;
}

export interface RankingRepository {
  getCurrentSeasonId(seasonId?: string): Promise<string>;
  getUserSeasonPoints(seasonId: string, userId: string): Promise<SeasonUserPoints | null>;
  getGroupMembers(seasonId: string, leagueNumber: number, groupId: string): Promise<GroupMember[]>;
  getGroupSize(seasonId: string, leagueNumber: number, groupId: string): Promise<number>;
  getFollowing(userId: string): Promise<Following[]>;
  getUserById(userId: string): Promise<User | null>;
  assignUserToGroup(params: {
    seasonId: string;
    leagueNumber: number;
    userId: string;
    points: number;
  }): Promise<string>;
}
