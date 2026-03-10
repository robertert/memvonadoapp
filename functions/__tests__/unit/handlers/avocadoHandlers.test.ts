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
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
  },
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date() }),
  },
}));

jest.mock(
  "../../../src/repositories/firestore/FirestoreAvocadoRepository",
  () => ({ FirestoreAvocadoRepository: jest.fn().mockImplementation(() => ({})) })
);

jest.mock("../../../src/services/AvocadoService", () => ({
  AvocadoService: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn().mockResolvedValue({
      currentPhase: 1,
      consecutiveDays: 0,
      lastGrowthDate: null,
      totalHarvests: 0,
      collectedSkins: [],
      harvestHistory: [],
      canHarvest: false,
      isWilted: false,
      goalMetToday: false,
    }),
    harvest: jest.fn().mockResolvedValue({
      success: true,
      awardedSkin: { id: "classic_avo", name: "Klasyczne", rarity: "common", obtainedAt: new Date() },
      isNewSkin: true,
      totalHarvests: 1,
    }),
    getConfig: jest.fn().mockResolvedValue({
      skins: [{ id: "classic_avo", name: "Klasyczne", rarity: "common", weight: 20 }],
      phaseDaysRequired: 1,
      totalPhases: 5,
    }),
  })),
}));

import { AvocadoService } from "../../../src/services/AvocadoService";
import { getAvocadoStatus, harvestAvocado } from "../../../src/handlers/avocadoHandlers";

let avoMock: Record<string, jest.Mock>;

beforeAll(() => {
  avoMock = (AvocadoService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  jest.resetAllMocks();
  avoMock.getStatus.mockResolvedValue({
    currentPhase: 1,
    consecutiveDays: 0,
    lastGrowthDate: null,
    totalHarvests: 0,
    collectedSkins: [],
    harvestHistory: [],
    canHarvest: false,
    isWilted: false,
    goalMetToday: false,
  });
  avoMock.harvest.mockResolvedValue({
    success: true,
    awardedSkin: { id: "classic_avo", name: "Klasyczne", rarity: "common", obtainedAt: new Date() },
    isNewSkin: true,
    totalHarvests: 1,
  });
});

function makeAuth(uid = "user-1") {
  return { uid, token: { email: "u@test.com" } };
}

// ── getAvocadoStatus ──────────────────────────────────────────────────────────

describe("getAvocadoStatus handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (getAvocadoStatus as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("returns status for authenticated user", async () => {
    const result = await (getAvocadoStatus as Function)({
      auth: makeAuth(),
      data: {},
    });

    expect(avoMock.getStatus).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ canHarvest: false });
  });

  it("maps service error to internal HttpsError", async () => {
    avoMock.getStatus.mockRejectedValueOnce(new Error("DB failure"));

    await expect(
      (getAvocadoStatus as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "internal" });
  });
});

// ── harvestAvocado ────────────────────────────────────────────────────────────

describe("harvestAvocado handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (harvestAvocado as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("returns harvest result for authenticated user", async () => {
    const result = await (harvestAvocado as Function)({
      auth: makeAuth(),
      data: {},
    });

    expect(avoMock.harvest).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, isNewSkin: true });
  });

  it("maps 'Cannot harvest yet' error to failed-precondition", async () => {
    avoMock.harvest.mockRejectedValueOnce(new Error("Cannot harvest yet. Days: 6/7"));

    await expect(
      (harvestAvocado as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("maps generic service error to internal", async () => {
    avoMock.harvest.mockRejectedValueOnce(new Error("Something failed"));

    await expect(
      (harvestAvocado as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "internal" });
  });
});
