import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  AvoQueryRequestSchema,
  AvoQueryResponseSchema,
  GetAvoQueryLimitResponseSchema,
} from "memvocado-types/schemas/api/avoHelper";
import { serializeTimestamps } from "../utils/serialization";
import { FirestoreUsageRepository } from "../repositories/firestore/FirestoreUsageRepository";
import { AvoQueryService } from "../services/AvoQueryService";

const usageRepo = new FirestoreUsageRepository("avoUsage");
const avoQueryService = new AvoQueryService(usageRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

export const avoQuery = onCall(
  { memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    const userId = request.auth.uid;

    const parsed = AvoQueryRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      logger.error("AVO query validation failed", parsed.error);
      throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
    }

    const { chipType, customQuestion, cardContext, responseLanguage } = parsed.data;

    try {
      const result = await avoQueryService.query({ userId, chipType, customQuestion, cardContext, responseLanguage });
      return serializeTimestamps(AvoQueryResponseSchema.parse(result));
    } catch (error) {
      logger.error("AVO query error", error);
      handleZodError(error, "avoQuery");
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to process AVO query");
    }
  }
);

export const getAvoQueryLimit = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = request.auth.uid;

  try {
    const result = await avoQueryService.getLimit(userId);
    return serializeTimestamps(GetAvoQueryLimitResponseSchema.parse(result));
  } catch (error) {
    logger.error("Error getting AVO query limit", error);
    handleZodError(error, "getAvoQueryLimit");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get AVO query limit");
  }
});
