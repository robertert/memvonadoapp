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
  "../../../src/repositories/firestore/FirestoreLeagueRepository",
  () => ({ FirestoreLeagueRepository: jest.fn().mockImplementation(() => ({})) })
);

jest.mock("../../../src/services/LeagueService", () => ({
  LeagueService: jest.fn().mockImplementation(() => ({
    getLeagueInfo: jest.fn().mockReturnValue({
      league: { id: 1, name: "Liga 1", color: "#8D8D8D", description: "Startowa liga" },
    }),
    getAllLeaguesInfo: jest.fn().mockReturnValue({ leagues: [] }),
    getUserGroup: jest.fn().mockResolvedValue({ groupId: "g1", members: [] }),
    updateUserLeague: jest.fn().mockResolvedValue({ updated: true }),
  })),
}));

import { LeagueService } from "../../../src/services/LeagueService";
import { getLeagueInfo, updateUserLeague } from "../../../src/handlers/leagueHandlers";

let leagueMock: Record<string, jest.Mock>;

beforeAll(() => {
  leagueMock = (LeagueService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  jest.resetAllMocks();
  leagueMock.getLeagueInfo.mockReturnValue({
    league: { id: 1, name: "Liga 1", color: "#8D8D8D", description: "Startowa liga" },
  });
  leagueMock.updateUserLeague.mockResolvedValue({ updated: true });
});

function makeAuth(uid = "user-1") {
  return { uid, token: { email: "u@test.com" } };
}

// ── getLeagueInfo ─────────────────────────────────────────────────────────────

describe("getLeagueInfo handler", () => {
  it("throws invalid-argument when leagueNumber is missing", async () => {
    await expect(
      (getLeagueInfo as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("returns league info for valid request", async () => {
    const result = await (getLeagueInfo as Function)({
      auth: null,
      data: { leagueNumber: 1 },
    });

    expect(leagueMock.getLeagueInfo).toHaveBeenCalledWith(1);
    expect(result).toBeDefined();
  });
});

// ── updateUserLeague ──────────────────────────────────────────────────────────

describe("updateUserLeague handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (updateUserLeague as Function)({
        auth: null,
        data: { userId: "u1", newLeague: 2 },
      })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when required fields are missing", async () => {
    await expect(
      (updateUserLeague as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("calls leagueService and returns result for valid request", async () => {
    const result = await (updateUserLeague as Function)({
      auth: makeAuth(),
      data: { userId: "u1", newLeague: 2 },
    });

    expect(leagueMock.updateUserLeague).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it("maps service error to internal HttpsError", async () => {
    leagueMock.updateUserLeague.mockRejectedValueOnce(new Error("failed"));

    await expect(
      (updateUserLeague as Function)({
        auth: makeAuth(),
        data: { userId: "u1", newLeague: 2 },
      })
    ).rejects.toMatchObject({ code: "internal" });
  });
});
