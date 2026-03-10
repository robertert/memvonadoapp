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
  })),
  FieldValue: {
    serverTimestamp: () => ({}),
    increment: (n: number) => n,
  },
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date() }),
  },
}));

jest.mock(
  "../../../src/repositories/firestore/FirestoreRankingRepository",
  () => ({ FirestoreRankingRepository: jest.fn().mockImplementation(() => ({})) })
);

jest.mock("../../../src/services/RankingService", () => ({
  RankingService: jest.fn().mockImplementation(() => ({
    getLeaderboard: jest.fn().mockResolvedValue({
      entries: [],
      groupId: null,
      leagueNumber: null,
      seasonId: "season-1",
      totalMembers: 0,
    }),
    getUserRanking: jest.fn().mockResolvedValue({
      position: null,
      groupId: null,
      leagueNumber: null,
      points: 0,
      totalMembers: null,
    }),
    getFollowingRankings: jest.fn().mockResolvedValue({ rankings: [] }),
    assignUserToGroup: jest.fn().mockResolvedValue({ success: true, groupId: "group-1" }),
  })),
}));

import { RankingService } from "../../../src/services/RankingService";
import { getLeaderboard, getUserRanking } from "../../../src/handlers/rankingHandlers";

let rankingMock: Record<string, jest.Mock>;

beforeAll(() => {
  rankingMock = (RankingService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  jest.resetAllMocks();
  rankingMock.getLeaderboard.mockResolvedValue({
    entries: [],
    groupId: null,
    leagueNumber: null,
    seasonId: "season-1",
    totalMembers: 0,
  });
  rankingMock.getUserRanking.mockResolvedValue({
    position: null,
    groupId: null,
    leagueNumber: null,
    points: 0,
    totalMembers: null,
  });
});

// ── getLeaderboard ────────────────────────────────────────────────────────────

describe("getLeaderboard handler", () => {
  it("throws invalid-argument when userId is missing", async () => {
    await expect(
      (getLeaderboard as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("calls rankingService and returns result for valid request", async () => {
    const result = await (getLeaderboard as Function)({
      auth: null,
      data: { userId: "u1" },
    });

    expect(rankingMock.getLeaderboard).toHaveBeenCalledWith("u1", undefined);
    expect(result).toBeDefined();
  });

  it("maps service error to internal HttpsError", async () => {
    rankingMock.getLeaderboard.mockRejectedValueOnce(new Error("DB error"));

    await expect(
      (getLeaderboard as Function)({ auth: null, data: { userId: "u1" } })
    ).rejects.toMatchObject({ code: "internal" });
  });
});

// ── getUserRanking ────────────────────────────────────────────────────────────

describe("getUserRanking handler", () => {
  it("throws invalid-argument when userId is missing", async () => {
    await expect(
      (getUserRanking as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("returns user ranking for valid request", async () => {
    const result = await (getUserRanking as Function)({
      auth: null,
      data: { userId: "u1" },
    });

    expect(rankingMock.getUserRanking).toHaveBeenCalledWith("u1", undefined);
    expect(result).toBeDefined();
  });
});
