import { z } from "zod";

import { AuthUserSnapshotSchema } from "../auth";

// ============================================================================
// Auth – request schemas
// ============================================================================

/**
 * ensureUserDocument nie przyjmuje żadnych danych w request.data.
 * Używamy pustego obiektu dla spójności kontraktu.
 */
export const EnsureUserDocumentRequestSchema = z.object({}).strict();

export type EnsureUserDocumentRequest = z.infer<
  typeof EnsureUserDocumentRequestSchema
>;

/**
 * completeOnboarding – dane z formularza onboardingowego.
 * Backend aktualnie używa tylko username i interests.
 */
export const CompleteOnboardingRequestSchema = z
  .object({
    username: z.string().min(3).max(32),
    interests: z.array(z.string()).min(3),
  })
  .strict();

export type CompleteOnboardingRequest = z.infer<
  typeof CompleteOnboardingRequestSchema
>;

// ============================================================================
// Auth – response schemas
// ============================================================================

/**
 * Prosty success response współdzielony przez authowe funkcje callable.
 * Trzymamy lokalnie, żeby uniknąć cyklicznych importów z api_refs.
 */
export const AuthSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponseSchema>;

export const EnsureUserDocumentResponseSchema = AuthSuccessResponseSchema;

export type EnsureUserDocumentResponse = z.infer<
  typeof EnsureUserDocumentResponseSchema
>;

export const CompleteOnboardingResponseSchema = AuthSuccessResponseSchema;

export type CompleteOnboardingResponse = z.infer<
  typeof CompleteOnboardingResponseSchema
>;

export const CheckUsernameAvailabilityRequestSchema = z
  .object({
    username: z.string().min(3).max(32),
  })
  .strict();

export type CheckUsernameAvailabilityRequest = z.infer<
  typeof CheckUsernameAvailabilityRequestSchema
>;

export const CheckUsernameAvailabilityResponseSchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();

export type CheckUsernameAvailabilityResponse = z.infer<
  typeof CheckUsernameAvailabilityResponseSchema
>;
