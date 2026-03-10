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
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(), get: jest.fn() })),
    batch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), commit: jest.fn() })),
  })),
  FieldValue: {
    serverTimestamp: () => ({}),
    increment: (n: number) => n,
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
  },
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date() }),
  },
}));

jest.mock(
  "../../../src/repositories/firestore/FirestoreCardRepository",
  () => ({ FirestoreCardRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreUserRepository",
  () => ({
    FirestoreUserRepository: jest.fn().mockImplementation(() => ({
      getUser: jest.fn().mockResolvedValue({ id: "user-1", username: "testuser" }),
    })),
  })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreStatsRepository",
  () => ({ FirestoreStatsRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreSeasonRepository",
  () => ({ FirestoreSeasonRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreAvocadoRepository",
  () => ({ FirestoreAvocadoRepository: jest.fn().mockImplementation(() => ({})) })
);

jest.mock("../../../src/services/CardProgressService", () => ({
  CardProgressService: jest.fn().mockImplementation(() => ({
    updateProgress: jest.fn().mockResolvedValue(undefined),
    undoCard: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("../../../src/services/StreakService", () => ({
  StreakService: jest.fn().mockImplementation(() => ({
    updateStreakOnLogin: jest.fn().mockResolvedValue({ status: "streak_safe", updated: false, currentStreak: 0 }),
    updateStreakIfQualified: jest.fn().mockResolvedValue({ qualified: false, updated: false, todayCount: 0 }),
  })),
}));

jest.mock("../../../src/services/UserService", () => ({
  UserService: jest.fn().mockImplementation(() => ({
    archiveDailyStatsIfNeeded: jest.fn().mockResolvedValue(null),
    toggleFollow: jest.fn().mockResolvedValue({ isFollowing: true }),
    isAdmin: jest.fn().mockResolvedValue(false),
    updateAllInOneStats: jest.fn().mockResolvedValue(undefined),
    getUserProgress: jest.fn().mockResolvedValue({ stats: {}, recentSessions: [] }),
    getStreakThreshold: jest.fn().mockResolvedValue(10),
  })),
}));

jest.mock("../../../src/services/SeasonService", () => ({
  SeasonService: jest.fn().mockImplementation(() => ({
    getCurrentSeason: jest.fn().mockResolvedValue({ id: "s1" }),
  })),
}));

jest.mock("../../../src/services/AvocadoService", () => ({
  AvocadoService: jest.fn().mockImplementation(() => ({
    updateGrowth: jest.fn().mockResolvedValue({ updated: false }),
    resetGrowth: jest.fn().mockResolvedValue({ wasReset: false }),
  })),
}));

import { CardProgressService } from "../../../src/services/CardProgressService";
import { UserService } from "../../../src/services/UserService";
import {
  updateCardProgress,
  undoCard,
  toggleFollow,
} from "../../../src/handlers/userHandlers";

let progressMock: Record<string, jest.Mock>;
let userServiceMock: Record<string, jest.Mock>;

beforeAll(() => {
  progressMock = (CardProgressService as jest.Mock).mock.results[0]?.value;
  userServiceMock = (UserService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  jest.resetAllMocks();
  progressMock.updateProgress.mockResolvedValue(undefined);
  progressMock.undoCard.mockResolvedValue(undefined);
  userServiceMock.toggleFollow.mockResolvedValue({ isFollowing: true });
});

function makeAuth(uid = "user-1") {
  return { uid, token: { email: "u@test.com" } };
}

function makeCard() {
  return {
    id: "card-1",
    cardData: { front: "Q", back: "A" },
    tags: [],
    createdAt: new Date(),
    firstLearn: { isNew: true },
  };
}

function makeDailyStats() {
  return {
    newCardsRemaining: 0,
    dueCardsRemaining: 0,
    inProgressDueCards: 0,
    inProgressNewCards: 0,
    completedNewToday: 0,
    completedDueToday: 0,
    lastUpdatedStats: new Date(),
  };
}

// ── updateCardProgress ────────────────────────────────────────────────────────

describe("updateCardProgress handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (updateCardProgress as Function)({
        auth: null,
        data: { userId: "u1", deckId: "d1", card: makeCard(), scheduledTime: 1000, dailyStats: null },
      })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when required fields are missing", async () => {
    await expect(
      (updateCardProgress as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws permission-denied when userId != auth.uid", async () => {
    await expect(
      (updateCardProgress as Function)({
        auth: makeAuth("different-user"),
        data: {
          userId: "user-1",
          deckId: "d1",
          card: makeCard(),
          scheduledTime: 1000,
          dailyStats: null,
        },
      })
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("returns success for valid request", async () => {
    const result = await (updateCardProgress as Function)({
      auth: makeAuth("user-1"),
      data: {
        userId: "user-1",
        deckId: "d1",
        card: makeCard(),
        scheduledTime: 1000,
        dailyStats: null,
      },
    });

    expect(progressMock.updateProgress).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true });
  });
});

// ── undoCard ──────────────────────────────────────────────────────────────────

describe("undoCard handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (undoCard as Function)({
        auth: null,
        data: { deckId: "d1", card: makeCard(), dailyStats: makeDailyStats() },
      })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when required fields are missing", async () => {
    await expect(
      (undoCard as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("returns success for valid request", async () => {
    const result = await (undoCard as Function)({
      auth: makeAuth("user-1"),
      data: { deckId: "d1", card: makeCard(), dailyStats: makeDailyStats() },
    });

    expect(progressMock.undoCard).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true });
  });
});

// ── toggleFollow ──────────────────────────────────────────────────────────────

describe("toggleFollow handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (toggleFollow as Function)({
        auth: null,
        data: { targetUserId: "u2" },
      })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when targetUserId is missing", async () => {
    await expect(
      (toggleFollow as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when trying to follow yourself", async () => {
    await expect(
      (toggleFollow as Function)({
        auth: makeAuth("self"),
        data: { targetUserId: "self" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("returns result for valid follow", async () => {
    const result = await (toggleFollow as Function)({
      auth: makeAuth("user-1"),
      data: { targetUserId: "user-2" },
    });

    expect(userServiceMock.toggleFollow).toHaveBeenCalledWith("user-1", "user-2");
    expect(result).toMatchObject({ success: true, isFollowing: true });
  });
});
