"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckUsernameAvailabilityResponseSchema = exports.CheckUsernameAvailabilityRequestSchema = exports.CompleteOnboardingResponseSchema = exports.EnsureUserDocumentResponseSchema = exports.AuthSuccessResponseSchema = exports.CompleteOnboardingRequestSchema = exports.EnsureUserDocumentRequestSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Auth – request schemas
// ============================================================================
/**
 * ensureUserDocument nie przyjmuje żadnych danych w request.data.
 * Używamy pustego obiektu dla spójności kontraktu.
 */
exports.EnsureUserDocumentRequestSchema = zod_1.z.object({}).strict();
/**
 * completeOnboarding – dane z formularza onboardingowego.
 * Backend aktualnie używa tylko username i interests.
 */
exports.CompleteOnboardingRequestSchema = zod_1.z
    .object({
    username: zod_1.z.string().min(3).max(32),
    interests: zod_1.z.array(zod_1.z.string()).min(3),
})
    .strict();
// ============================================================================
// Auth – response schemas
// ============================================================================
/**
 * Prosty success response współdzielony przez authowe funkcje callable.
 * Trzymamy lokalnie, żeby uniknąć cyklicznych importów z api_refs.
 */
exports.AuthSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
});
exports.EnsureUserDocumentResponseSchema = exports.AuthSuccessResponseSchema;
exports.CompleteOnboardingResponseSchema = exports.AuthSuccessResponseSchema;
exports.CheckUsernameAvailabilityRequestSchema = zod_1.z
    .object({
    username: zod_1.z.string().min(3).max(32),
})
    .strict();
exports.CheckUsernameAvailabilityResponseSchema = zod_1.z
    .object({
    isAvailable: zod_1.z.boolean(),
})
    .strict();
