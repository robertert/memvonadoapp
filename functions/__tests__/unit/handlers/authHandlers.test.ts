/**
 * Unit tests for authHandlers — validates:
 *   - Auth check (no auth → unauthenticated)
 *   - Zod validation (bad request data → invalid-argument)
 *   - Error mapping (service error → correct HttpsError code)
 *
 * All Firebase / Firestore / service dependencies are mocked.
 */

// ── Module mocks (hoisted before imports) ────────────────────────────────────

jest.mock("firebase-functions/v2/https", () => {
  class HttpsError extends Error {
    code: string;
    details?: unknown;
    constructor(code: string, message: string, details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }
  return {
    onCall: (optsOrFn: unknown, fn?: unknown) =>
      typeof optsOrFn === "function" ? optsOrFn : fn,
    HttpsError,
  };
});

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  FieldValue: {
    serverTimestamp: () => ({}),
    increment: (n: number) => n,
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
  },
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date() }),
    fromDate: (d: Date) => ({
      seconds: d.getTime() / 1000,
      nanoseconds: 0,
      toDate: () => d,
    }),
  },
}));

jest.mock(
  "../../../src/repositories/firestore/FirestoreUserRepository",
  () => ({
    FirestoreUserRepository: jest.fn().mockImplementation(() => ({})),
  })
);

jest.mock("../../../src/services/AuthService", () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    ensureUserDocument: jest.fn().mockResolvedValue({ created: true }),
    checkUsernameAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
    completeOnboarding: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { AuthService } from "../../../src/services/AuthService";
import {
  ensureUserDocument,
  checkUsernameAvailability,
  completeOnboarding,
} from "../../../src/handlers/authHandlers";

// Capture the AuthService mock instance created at module load time
let authMock: {
  ensureUserDocument: jest.Mock;
  checkUsernameAvailability: jest.Mock;
  completeOnboarding: jest.Mock;
};

beforeAll(() => {
  authMock = (AuthService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  // resetAllMocks clears queued once-values too (unlike clearAllMocks)
  jest.resetAllMocks();
  authMock.ensureUserDocument.mockResolvedValue({ created: true });
  authMock.checkUsernameAvailability.mockResolvedValue({ isAvailable: true });
  authMock.completeOnboarding.mockResolvedValue(undefined);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuth(uid = "user-123") {
  return { uid, token: { email: "test@test.com", name: "Test User" } };
}

// ── ensureUserDocument ────────────────────────────────────────────────────────

describe("ensureUserDocument handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (ensureUserDocument as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("calls authService and returns success when authenticated", async () => {
    const result = await (ensureUserDocument as Function)({
      auth: makeAuth(),
      data: {},
    });

    expect(authMock.ensureUserDocument).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true });
  });

  it("propagates internal errors as internal HttpsError", async () => {
    authMock.ensureUserDocument.mockRejectedValueOnce(new Error("DB failure"));

    await expect(
      (ensureUserDocument as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "internal" });
  });
});

// ── checkUsernameAvailability ─────────────────────────────────────────────────

describe("checkUsernameAvailability handler", () => {
  it("throws invalid-argument when username field is missing", async () => {
    await expect(
      (checkUsernameAvailability as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("returns availability result for valid username", async () => {
    authMock.checkUsernameAvailability.mockResolvedValueOnce({ isAvailable: false });

    const result = await (checkUsernameAvailability as Function)({
      auth: null,
      data: { username: "taken_user" },
    });

    expect(result).toMatchObject({ isAvailable: false });
  });
});

// ── completeOnboarding ────────────────────────────────────────────────────────

describe("completeOnboarding handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (completeOnboarding as Function)({
        auth: null,
        data: { username: "alice", interests: [] },
      })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when username is missing from request", async () => {
    await expect(
      (completeOnboarding as Function)({
        auth: makeAuth(),
        data: { interests: ["music"] },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("maps service already-exists error to HttpsError already-exists", async () => {
    authMock.completeOnboarding.mockRejectedValueOnce(
      Object.assign(new Error("Username is already taken"), { code: "already-exists" })
    );

    await expect(
      (completeOnboarding as Function)({
        auth: makeAuth(),
        data: { username: "taken", interests: ["music"] },
      })
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("returns success when onboarding completes normally", async () => {
    const result = await (completeOnboarding as Function)({
      auth: makeAuth(),
      data: { username: "newuser", interests: ["music", "art"] },
    });

    expect(result).toMatchObject({ success: true });
    expect(authMock.completeOnboarding).toHaveBeenCalledWith({
      uid: "user-123",
      email: "test@test.com",
      username: "newuser",
      interests: ["music", "art"],
    });
  });
});
