import { z } from "zod";
/**
 * ensureUserDocument nie przyjmuje żadnych danych w request.data.
 * Używamy pustego obiektu dla spójności kontraktu.
 */
export declare const EnsureUserDocumentRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type EnsureUserDocumentRequest = z.infer<typeof EnsureUserDocumentRequestSchema>;
/**
 * completeOnboarding – dane z formularza onboardingowego.
 * Backend aktualnie używa tylko username i interests.
 */
export declare const CompleteOnboardingRequestSchema: z.ZodObject<{
    username: z.ZodString;
    interests: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    username: string;
    interests: string[];
}, {
    username: string;
    interests: string[];
}>;
export type CompleteOnboardingRequest = z.infer<typeof CompleteOnboardingRequestSchema>;
/**
 * Prosty success response współdzielony przez authowe funkcje callable.
 * Trzymamy lokalnie, żeby uniknąć cyklicznych importów z api_refs.
 */
export declare const AuthSuccessResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
}, {
    success: boolean;
    message?: string | undefined;
}>;
export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponseSchema>;
export declare const EnsureUserDocumentResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
}, {
    success: boolean;
    message?: string | undefined;
}>;
export type EnsureUserDocumentResponse = z.infer<typeof EnsureUserDocumentResponseSchema>;
export declare const CompleteOnboardingResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
}, {
    success: boolean;
    message?: string | undefined;
}>;
export type CompleteOnboardingResponse = z.infer<typeof CompleteOnboardingResponseSchema>;
export declare const CheckUsernameAvailabilityRequestSchema: z.ZodObject<{
    username: z.ZodString;
}, "strict", z.ZodTypeAny, {
    username: string;
}, {
    username: string;
}>;
export type CheckUsernameAvailabilityRequest = z.infer<typeof CheckUsernameAvailabilityRequestSchema>;
export declare const CheckUsernameAvailabilityResponseSchema: z.ZodObject<{
    isAvailable: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    isAvailable: boolean;
}, {
    isAvailable: boolean;
}>;
export type CheckUsernameAvailabilityResponse = z.infer<typeof CheckUsernameAvailabilityResponseSchema>;
