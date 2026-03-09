import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import {
  EnsureUserDocumentRequestSchema,
  EnsureUserDocumentResponseSchema,
  CompleteOnboardingRequestSchema,
  CompleteOnboardingResponseSchema,
  CheckUsernameAvailabilityRequestSchema,
  CheckUsernameAvailabilityResponseSchema,
} from "memvocado-types/schemas/api/auth";
import { FirestoreUserRepository } from "../repositories/firestore/FirestoreUserRepository";
import { AuthService } from "../services/AuthService";

const REGION = "europe-west1";

const userRepo = new FirestoreUserRepository();
const authService = new AuthService(userRepo);

export const ensureUserDocument = onCall(
  { region: REGION },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const parsed = EnsureUserDocumentRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    try {
      const email = request.auth?.token?.email || "";
      const displayName = request.auth?.token?.name || undefined;

      await authService.ensureUserDocument({ uid, email, displayName });

      const validated = EnsureUserDocumentResponseSchema.parse({
        success: true,
        message: "User document ensured",
      });
      return validated;
    } catch (error) {
      logger.error(`ensureUserDocument: failed for ${uid}`, error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to create user document. Please try again.");
    }
  }
);

export const checkUsernameAvailability = onCall(
  { region: REGION },
  async (request) => {
    const parsed = CheckUsernameAvailabilityRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    try {
      const { username } = parsed.data;
      if (!username) {
        throw new HttpsError("invalid-argument", "Username is required");
      }

      const result = await authService.checkUsernameAvailability(username);
      return CheckUsernameAvailabilityResponseSchema.parse(result);
    } catch (error) {
      logger.error("checkUsernameAvailability: failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to check username availability");
    }
  }
);

export const completeOnboarding = onCall(
  { region: REGION },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const parsed = CompleteOnboardingRequestSchema.safeParse(request.data || {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request data", {
        issues: parsed.error.issues,
      });
    }

    const { username, interests } = parsed.data;
    const email = request.auth?.token?.email || "";

    try {
      await authService.completeOnboarding({ uid, email, username, interests });

      const validated = CompleteOnboardingResponseSchema.parse({
        success: true,
        message: "Onboarding completed successfully",
      });
      return validated;
    } catch (error) {
      logger.error(`completeOnboarding: failed for ${uid}`, error);
      if (error instanceof z.ZodError) {
        throw new HttpsError("internal", "Invalid response format");
      }
      if (error instanceof HttpsError) throw error;
      const err = error as { code?: string; message?: string };
      if (err.code === "already-exists") {
        throw new HttpsError("already-exists", "Username is already taken");
      }
      throw new HttpsError("internal", "Failed to complete onboarding. Please try again.");
    }
  }
);
