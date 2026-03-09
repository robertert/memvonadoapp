import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  GetAvocadoStatusRequestSchema,
  GetAvocadoStatusResponseSchema,
  HarvestAvocadoRequestSchema,
  HarvestAvocadoResponseSchema,
  GetAvocadoConfigRequestSchema,
} from "memvocado-types";
import { serializeTimestamps } from "../utils/serialization";
import { FirestoreAvocadoRepository } from "../repositories/firestore/FirestoreAvocadoRepository";
import { AvocadoService } from "../services/AvocadoService";

const avocadoRepo = new FirestoreAvocadoRepository();
const avocadoService = new AvocadoService(avocadoRepo);

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

export const getAvocadoStatus = onCall(async (request) => {
  const parsed = GetAvocadoStatusRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = request.auth.uid;

  try {
    const status = await avocadoService.getStatus(userId);

    const serializedSkins = status.collectedSkins.map((skin) => ({
      ...skin,
      obtainedAt: skin.obtainedAt instanceof Date ? skin.obtainedAt.toISOString() : skin.obtainedAt,
    }));

    const serializedHistory = status.harvestHistory.map((log) => ({
      ...log,
      harvestedAt: log.harvestedAt instanceof Date ? log.harvestedAt.toISOString() : log.harvestedAt,
    }));

    const rawResponse = {
      ...status,
      collectedSkins: serializedSkins,
      harvestHistory: serializedHistory,
    };

    const validated = GetAvocadoStatusResponseSchema.parse(rawResponse);
    return serializeTimestamps(validated);
  } catch (error) {
    logger.error("getAvocadoStatus failed", error);
    handleZodError(error, "getAvocadoStatus");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get avocado status");
  }
});

export const harvestAvocado = onCall(async (request) => {
  const parsed = HarvestAvocadoRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = request.auth.uid;

  try {
    const result = await avocadoService.harvest(userId);

    const rawResponse = {
      success: result.success,
      awardedSkin: {
        ...result.awardedSkin,
        obtainedAt: result.awardedSkin.obtainedAt.toISOString(),
      },
      isNewSkin: result.isNewSkin,
      totalHarvests: result.totalHarvests,
    };

    const validated = HarvestAvocadoResponseSchema.parse(rawResponse);
    return serializeTimestamps(validated);
  } catch (error) {
    logger.error("harvestAvocado failed", error);
    handleZodError(error, "harvestAvocado");
    if (error instanceof HttpsError) throw error;
    if (error instanceof Error && error.message.startsWith("Cannot harvest yet")) {
      throw new HttpsError("failed-precondition", error.message);
    }
    throw new HttpsError("internal", "Failed to harvest avocado");
  }
});

export const getAvocadoConfig = onCall(async (request) => {
  const parsed = GetAvocadoConfigRequestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid request data", { issues: parsed.error.issues });
  }

  try {
    const config = await avocadoService.getConfig();
    return serializeTimestamps(config);
  } catch (error) {
    logger.error("getAvocadoConfig failed", error);
    handleZodError(error, "getAvocadoConfig");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to get avocado config");
  }
});
