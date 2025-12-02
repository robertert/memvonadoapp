"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLoginResponseSchema = exports.AuthRegisterResponseSchema = exports.AuthUserSnapshotSchema = exports.AuthLoginRequestSchema = exports.AuthRegisterRequestSchema = void 0;
const zod_1 = require("zod");
const user_1 = require("./user");
/**
 * Żądanie rejestracji użytkownika wykonywane przez frontend.
 * Bazuje na minimalnych danych potrzebnych do utworzenia konta.
 */
exports.AuthRegisterRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email(),
    username: zod_1.z
        .string()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_]+$/)
        .optional(),
    language: zod_1.z.string().min(2).max(8).optional(),
})
    .strict();
/**
 * Żądanie logowania użytkownika.
 */
exports.AuthLoginRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email(),
})
    .strict();
/**
 * Snapshot danych użytkownika zwracany w odpowiedziach auth.
 * Pozwala na obecność dodatkowych pól przechowywanych w dokumencie.
 */
exports.AuthUserSnapshotSchema = zod_1.z
    .object({
    id: user_1.UserSchema.shape.id,
    username: user_1.UserSchema.shape.username,
    email: user_1.UserSchema.shape.email,
    settings: user_1.UserSchema.shape.settings,
    createdAt: user_1.UserSchema.shape.createdAt,
    updatedAt: user_1.UserSchema.shape.updatedAt,
    league: user_1.UserSchema.shape.league,
    currentGroupId: user_1.UserSchema.shape.currentGroupId,
    experiencePoints: user_1.UserSchema.shape.experiencePoints,
    currencyCount: user_1.UserSchema.shape.currencyCount,
    stats: user_1.UserSchema.shape.stats,
    followingCount: user_1.UserSchema.shape.followingCount,
    followersCount: user_1.UserSchema.shape.followersCount,
})
    .passthrough();
exports.AuthRegisterResponseSchema = zod_1.z
    .object({
    uid: zod_1.z.string(),
    customToken: zod_1.z.string(),
    user: exports.AuthUserSnapshotSchema,
})
    .strict();
exports.AuthLoginResponseSchema = zod_1.z
    .object({
    uid: zod_1.z.string(),
    customToken: zod_1.z.string(),
    idToken: zod_1.z.string().optional(),
    refreshToken: zod_1.z.string().optional(),
    expiresIn: zod_1.z.number().optional(),
    user: exports.AuthUserSnapshotSchema.optional(),
})
    .strict();
