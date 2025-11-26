import { z } from "zod";
import { UserSchema } from "./user";

/**
 * Żądanie rejestracji użytkownika wykonywane przez frontend.
 * Bazuje na minimalnych danych potrzebnych do utworzenia konta.
 */
export const AuthRegisterRequestSchema = z
  .object({
    email: z.string().email(),
    username: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    language: z.string().min(2).max(8).optional(),
  })
  .strict();

export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;

/**
 * Żądanie logowania użytkownika.
 */
export const AuthLoginRequestSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;

/**
 * Snapshot danych użytkownika zwracany w odpowiedziach auth.
 * Pozwala na obecność dodatkowych pól przechowywanych w dokumencie.
 */
export const AuthUserSnapshotSchema = z
  .object({
    id: UserSchema.shape.id,
    username: UserSchema.shape.username,
    email: UserSchema.shape.email,
    settings: UserSchema.shape.settings,
    createdAt: UserSchema.shape.createdAt,
    updatedAt: UserSchema.shape.updatedAt,
    league: UserSchema.shape.league,
    currentGroupId: UserSchema.shape.currentGroupId,
    experiencePoints: UserSchema.shape.experiencePoints,
    currencyCount: UserSchema.shape.currencyCount,
    stats: UserSchema.shape.stats,
    followingCount: UserSchema.shape.followingCount,
    followersCount: UserSchema.shape.followersCount,
  })
  .passthrough();

export type AuthUserSnapshot = z.infer<typeof AuthUserSnapshotSchema>;

export const AuthRegisterResponseSchema = z
  .object({
    uid: z.string(),
    customToken: z.string(),
    user: AuthUserSnapshotSchema,
  })
  .strict();

export type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;

export const AuthLoginResponseSchema = z
  .object({
    uid: z.string(),
    customToken: z.string(),
    idToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresIn: z.number().optional(),
    user: AuthUserSnapshotSchema.optional(),
  })
  .strict();

export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;
