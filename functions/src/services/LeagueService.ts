import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";
import type { LeagueRepository } from "../repositories/interfaces/LeagueRepository";

export interface LeagueInfo {
  id: number;
  name: string;
  color: string;
  description: string;
}

const LEAGUE_INFO: LeagueInfo[] = [
  { id: 1, name: "Liga 1", color: "#8D8D8D", description: "Startowa liga" },
  { id: 2, name: "Liga 2", color: "#7DA1B9", description: "Wejdź do Top 10" },
  { id: 3, name: "Liga 3", color: "#7EC384", description: "Stabilny rozwój" },
  { id: 4, name: "Liga 4", color: "#A9D68B", description: "Trzymaj passę" },
  { id: 5, name: "Liga 5", color: "#C7E3A1", description: "Wyższy poziom" },
  { id: 6, name: "Liga 6", color: "#E4F0B8", description: "Lepsza konkurencja" },
  { id: 7, name: "Liga 7", color: "#F9C9A7", description: "Stań na podium" },
  { id: 8, name: "Liga 8", color: "#F6B38F", description: "Top 5 na wyciągnięcie" },
  { id: 9, name: "Liga 9", color: "#F29B78", description: "Blisko awansu" },
  { id: 10, name: "Liga 10", color: "#F27C8A", description: "Silna stawka" },
  { id: 11, name: "Liga 11", color: "#CD7F32", description: "Brązowa Liga" },
  { id: 12, name: "Liga 12", color: "#C0C0C0", description: "Srebrna Liga" },
  { id: 13, name: "Liga 13", color: "#FFD700", description: "Złota Liga" },
  { id: 14, name: "Liga 14", color: "#6A5ACD", description: "Platynowa Liga" },
  { id: 15, name: "Liga 15", color: "#00BFFF", description: "Diamentowa Liga" },
];

/**
 * Business logic for league info, group membership, and league transitions.
 */
export class LeagueService {
  /**
   * @param {LeagueRepository} repo - Data access layer.
   */
  constructor(private readonly repo: LeagueRepository) {}

  /**
   * Returns static info for a single league.
   * @param {number} leagueNumber - League number (1–15).
   * @return {object} League info object.
   */
  getLeagueInfo(leagueNumber: number) {
    const league = LEAGUE_INFO.find((l) => l.id === leagueNumber);
    if (!league) {
      throw new HttpsError("not-found", "League not found");
    }
    return { league };
  }

  /**
   * Returns static info for all leagues.
   * @return {object} Array of all league info objects.
   */
  getAllLeaguesInfo() {
    return { leagues: LEAGUE_INFO };
  }

  /**
   * Returns the user's current league group details.
   * @param {string} userId - User ID.
   * @param {string} [seasonId] - Optional season ID.
   * @return {Promise<object>} Group ID, league number, and capacity info.
   */
  async getUserGroup(userId: string, seasonId?: string) {
    const currentSeasonId = await this.repo.getCurrentSeasonId(seasonId);

    const userSeasonPoints = await this.repo.getUserSeasonPoints(
      currentSeasonId,
      userId
    );

    if (!userSeasonPoints) {
      logger.info("User not found in seasonUserPoints", {
        userId,
        seasonId: currentSeasonId,
      });
      return {
        groupId: null as string | null,
        leagueNumber: null as number | null,
        memberCount: 0,
        capacity: 20,
        isFull: false,
      };
    }

    if (!userSeasonPoints.groupId) {
      return {
        groupId: null as string | null,
        leagueNumber: null as number | null,
        memberCount: 0,
        capacity: 20,
        isFull: false,
      };
    }

    const group = await this.repo.getGroupById(
      currentSeasonId,
      userSeasonPoints.league ?? 1,
      userSeasonPoints.groupId
    );

    if (!group) {
      logger.error("Group not found - data inconsistency", {
        seasonId: currentSeasonId,
        league: userSeasonPoints.league,
        groupId: userSeasonPoints.groupId,
        userId,
      });
      throw new HttpsError(
        "failed-precondition",
        "User's assigned group does not exist. Data may be inconsistent."
      );
    }

    return {
      groupId: group.id,
      leagueNumber: group.leagueNumber,
      memberCount: group.currentCount,
      capacity: group.capacity,
      isFull: group.isFull,
    };
  }

  /**
   * Moves the user to a new league: removes from old group, assigns to new group.
   * @param {string} userId - User ID.
   * @param {number} newLeague - Target league number.
   * @param {string} [seasonId] - Optional season ID.
   * @return {Promise<object>} Success flag, new league, and new group ID.
   */
  async updateUserLeague(
    userId: string,
    newLeague: number,
    seasonId?: string
  ) {
    const currentSeasonId = await this.repo.getCurrentSeasonId(seasonId);

    const user = await this.repo.getUserById(userId);
    if (!user) {
      throw new HttpsError("not-found", "User not found");
    }

    const currentLeague = user.league;

    if (currentLeague === newLeague) {
      return { success: true, league: newLeague };
    }

    // Get old season points BEFORE updating
    const oldSeasonPoints = await this.repo.getUserSeasonPoints(
      currentSeasonId,
      userId
    );
    const oldLeague = oldSeasonPoints?.league ?? currentLeague;
    const oldGroupId = oldSeasonPoints?.groupId;
    const userPoints = oldSeasonPoints?.points ?? 0;

    if (oldGroupId) {
      await this.repo.removeUserFromGroup(
        currentSeasonId,
        oldLeague,
        oldGroupId,
        userId
      );
    }

    // Update user doc: set new league, clear currentGroupId
    await this.repo.updateUserLeagueDoc(userId, newLeague);

    // Update season points: set new league (groupId was cleared by removeUserFromGroup)
    await this.repo.updateUserSeasonPoints(currentSeasonId, userId, {
      league: newLeague,
    });

    // Assign to new group
    const newGroupId = await this.repo.assignUserToGroup({
      seasonId: currentSeasonId,
      leagueNumber: newLeague,
      userId,
      points: userPoints,
    });

    logger.info("User league updated", {
      userId,
      fromLeague: currentLeague,
      toLeague: newLeague,
      groupId: newGroupId,
      seasonId: currentSeasonId,
    });

    return { success: true, league: newLeague, groupId: newGroupId };
  }
}
