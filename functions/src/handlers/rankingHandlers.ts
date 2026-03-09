import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  GetLeaderboardRequestSchema,
  GetUserRankingRequestSchema,
  GetFollowingRankingsRequestSchema,
  AssignUserToGroupRequestSchema,
  GetLeaderboardResponseSchema,
  GetUserRankingResponseSchema,
  GetFollowingRankingsResponseSchema,
  AssignUserToGroupResponseSchema,
} from "memvocado-types";
import { FirestoreRankingRepository } from "../repositories/firestore/FirestoreRankingRepository";
import { RankingService } from "../services/RankingService";
import { serializeTimestamps } from "../utils/serialization";

const REGION = "europe-west1";

const rankingRepo = new FirestoreRankingRepository();
const rankingService = new RankingService(rankingRepo);

export const getLeaderboard = onCall(
  { region: REGION },
  async (request) => {
    const parsed = GetLeaderboardRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, seasonId } = parsed.data;

    try {
      const result = await rankingService.getLeaderboard(userId, seasonId);
      GetLeaderboardResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting leaderboard", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get leaderboard");
    }
  }
);

export const getUserRanking = onCall(
  { region: REGION },
  async (request) => {
    const parsed = GetUserRankingRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, seasonId } = parsed.data;

    try {
      const result = await rankingService.getUserRanking(userId, seasonId);
      GetUserRankingResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting user ranking", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get user ranking");
    }
  }
);

export const getFollowingRankings = onCall(
  { region: REGION },
  async (request) => {
    const parsed = GetFollowingRankingsRequestSchema.safeParse(
      request.data || {}
    );
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, seasonId } = parsed.data;

    try {
      const result = await rankingService.getFollowingRankings(
        userId,
        seasonId
      );
      GetFollowingRankingsResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting following rankings", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get following rankings");
    }
  }
);

export const assignUserToGroup = onCall(
  { region: REGION },
  async (request) => {
    const parsed = AssignUserToGroupRequestSchema.safeParse(
      request.data || {}
    );
    if (!parsed.success) {
      logger.error("Invalid request data", { issues: parsed.error.issues });
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, leagueNumber, seasonId } = parsed.data;

    try {
      const result = await rankingService.assignUserToGroup(
        userId,
        leagueNumber,
        seasonId
      );
      AssignUserToGroupResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error assigning user to group", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to assign user to group");
    }
  }
);
