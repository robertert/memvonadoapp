import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  GetLeagueInfoRequestSchema,
  GetUserGroupRequestSchema,
  UpdateUserLeagueRequestSchema,
} from "memvocado-types/schemas/api/league";
import {
  GetLeagueInfoResponseSchema,
  GetUserGroupResponseSchema,
  GetAllLeaguesInfoResponseSchema,
} from "../types/common";
import { FirestoreLeagueRepository } from "../repositories/firestore/FirestoreLeagueRepository";
import { LeagueService } from "../services/LeagueService";
import { serializeTimestamps } from "../utils/serialization";

const REGION = "europe-west1";

const leagueRepo = new FirestoreLeagueRepository();
const leagueService = new LeagueService(leagueRepo);

export const getLeagueInfo = onCall(
  { region: REGION },
  async (request) => {
    const parsed = GetLeagueInfoRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { leagueNumber } = parsed.data;

    try {
      const result = leagueService.getLeagueInfo(leagueNumber);
      GetLeagueInfoResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting league info", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get league info");
    }
  }
);

export const getAllLeaguesInfo = onCall(
  { region: REGION },
  async () => {
    try {
      const result = leagueService.getAllLeaguesInfo();
      GetAllLeaguesInfoResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting all leagues info", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get all leagues info");
    }
  }
);

export const getUserGroup = onCall(
  { region: REGION },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const parsed = GetUserGroupRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, seasonId } = parsed.data;

    try {
      const result = await leagueService.getUserGroup(userId, seasonId);
      GetUserGroupResponseSchema.parse(result);
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error getting user group", error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to get user group");
    }
  }
);

export const updateUserLeague = onCall(
  { region: REGION },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const parsed = UpdateUserLeagueRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { userId, newLeague, seasonId } = parsed.data;

    try {
      const result = await leagueService.updateUserLeague(
        userId,
        newLeague,
        seasonId
      );
      return serializeTimestamps(result);
    } catch (error) {
      logger.error("Error updating user league", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to update user league");
    }
  }
);
