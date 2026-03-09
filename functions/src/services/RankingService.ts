import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import { UserSchema } from "../types/common";
import type { RankingRepository } from "../repositories/interfaces/RankingRepository";
import type { Following } from "memvocado-types";

/**
 * Business logic for leaderboard, user ranking, and group assignment.
 */
export class RankingService {
  /**
   * @param {RankingRepository} repo - Data access layer.
   */
  constructor(private readonly repo: RankingRepository) {}

  /**
   * Returns the full leaderboard for the user's current league group.
   * @param {string} userId - User ID.
   * @param {string} [seasonId] - Optional season ID.
   * @return {Promise<object>} Leaderboard entries with positions.
   */
  async getLeaderboard(userId: string, seasonId?: string) {
    const currentSeasonId = await this.repo.getCurrentSeasonId(seasonId);

    const userSeasonPoints = await this.repo.getUserSeasonPoints(
      currentSeasonId,
      userId
    );

    if (!userSeasonPoints) {
      return {
        entries: [] as Array<{
          userId: string;
          username: string;
          points: number;
          position: number;
          lastActivityAt: Date | null;
        }>,
        groupId: null as string | null,
        leagueNumber: null as number | null,
        seasonId: currentSeasonId,
        totalMembers: 0,
      };
    }

    const userLeague = userSeasonPoints.league ?? 1;
    const userGroupId = userSeasonPoints.groupId;

    if (!userGroupId) {
      return {
        entries: [] as Array<{
          userId: string;
          username: string;
          points: number;
          position: number;
          lastActivityAt: Date | null;
        }>,
        groupId: null as string | null,
        leagueNumber: userLeague,
        seasonId: currentSeasonId,
        totalMembers: 0,
      };
    }

    const members = await this.repo.getGroupMembers(
      currentSeasonId,
      userLeague,
      userGroupId
    );

    const entries = await Promise.all(
      members.map(async (member, index) => {
        let username = "Unknown";
        try {
          const userDoc = await this.repo.getUserById(member.userId);
          if (userDoc) {
            username = userDoc.username || "Unknown";
          }
        } catch (error) {
          logger.warn("Error fetching username", { userId: member.userId });
        }

        return {
          userId: member.userId,
          username,
          points: member.points,
          position: index + 1,
          lastActivityAt: member.lastActivityAt,
        };
      })
    );

    return {
      entries,
      groupId: userGroupId,
      leagueNumber: userLeague,
      seasonId: currentSeasonId,
      totalMembers: entries.length,
    };
  }

  /**
   * Returns the user's position within their league group.
   * @param {string} userId - User ID.
   * @param {string} [seasonId] - Optional season ID.
   * @return {Promise<object>} Position, points, and group info.
   */
  async getUserRanking(userId: string, seasonId?: string) {
    const currentSeasonId = await this.repo.getCurrentSeasonId(seasonId);

    const userSeasonPoints = await this.repo.getUserSeasonPoints(
      currentSeasonId,
      userId
    );

    if (!userSeasonPoints) {
      return {
        position: null as number | null,
        groupId: null as string | null,
        leagueNumber: null as number | null,
        points: 0,
        totalMembers: null as number | null,
      };
    }

    const userLeague = userSeasonPoints.league ?? 1;
    const userGroupId = userSeasonPoints.groupId;
    const userPoints = userSeasonPoints.points ?? 0;

    if (!userGroupId) {
      return {
        position: null as number | null,
        groupId: null as string | null,
        leagueNumber: userLeague,
        points: userPoints,
        totalMembers: null as number | null,
      };
    }

    const allMembers = await this.repo.getGroupMembers(
      currentSeasonId,
      userLeague,
      userGroupId
    );
    const membersWithMorePoints = allMembers.filter(
      (m) => m.points > userPoints
    );
    const position = membersWithMorePoints.length + 1;

    return {
      position,
      groupId: userGroupId,
      leagueNumber: userLeague,
      points: userPoints,
      totalMembers: allMembers.length,
    };
  }

  /**
   * Returns ranking info for all users the given user follows.
   * @param {string} userId - User ID.
   * @param {string} [seasonId] - Optional season ID.
   * @return {Promise<object>} Rankings sorted by points descending.
   */
  async getFollowingRankings(userId: string, seasonId?: string) {
    const currentSeasonId = await this.repo.getCurrentSeasonId(seasonId);

    const following = await this.repo.getFollowing(userId);

    if (following.length === 0) {
      return {
        rankings: [] as Array<{
          userId: string;
          username?: string;
          position: number | null;
          points: number;
          leagueNumber: number;
          groupId?: string;
          totalMembers?: number;
        }>,
      };
    }

    const rankings = await Promise.all(
      following.map(async (f: Following) => {
        try {
          const friendId = f.userId;
          const friendSeasonPoints = await this.repo.getUserSeasonPoints(
            currentSeasonId,
            friendId
          );

          if (!friendSeasonPoints) return null;

          const friendLeague = friendSeasonPoints.league ?? 1;
          const friendGroupId = friendSeasonPoints.groupId;
          const friendPoints = friendSeasonPoints.points ?? 0;

          if (!friendGroupId) {
            return {
              userId: friendId,
              position: null as number | null,
              points: friendPoints,
              leagueNumber: friendLeague,
            };
          }

          const allMembers = await this.repo.getGroupMembers(
            currentSeasonId,
            friendLeague,
            friendGroupId
          );
          const membersWithMorePoints = allMembers.filter(
            (m) => m.points > friendPoints
          );
          const position = membersWithMorePoints.length + 1;
          const totalMembers = allMembers.length;

          const friendUser = await this.repo.getUserById(friendId);
          const username = friendUser?.username || "Unknown";

          return {
            userId: friendId,
            username,
            position,
            points: friendPoints,
            leagueNumber: friendLeague,
            groupId: friendGroupId,
            totalMembers,
          };
        } catch (error) {
          logger.warn("Error getting friend ranking", {
            userId: f.userId,
            error,
          });
          return null;
        }
      })
    );

    const validRankings = rankings
      .filter(
        (
          r
        ): r is NonNullable<(typeof rankings)[number]> => r !== null
      )
      .sort((a, b) => (b?.points ?? 0) - (a?.points ?? 0));

    return { rankings: validRankings };
  }

  /**
   * Assigns a user to an available group in the specified league.
   * @param {string} userId - User ID.
   * @param {number} leagueNumber - Target league number.
   * @param {string} seasonId - Season ID.
   * @return {Promise<object>} Success flag and assigned group ID.
   */
  async assignUserToGroup(
    userId: string,
    leagueNumber: number,
    seasonId: string
  ) {
    const user = await this.repo.getUserById(userId);
    if (!user) {
      throw new HttpsError("not-found", "User not found");
    }

    UserSchema.parse(user);
    const userLeague = leagueNumber ?? user.league ?? 1;

    const userSeasonPointsData = await this.repo.getUserSeasonPoints(
      seasonId,
      userId
    );
    const userPoints = userSeasonPointsData?.points ?? 0;

    const groupId = await this.repo.assignUserToGroup({
      seasonId,
      leagueNumber: userLeague,
      userId,
      points: userPoints,
    });

    logger.info("User assigned to group", {
      userId,
      leagueNumber: userLeague,
      groupId,
      seasonId,
    });

    return { success: true, groupId };
  }
}
