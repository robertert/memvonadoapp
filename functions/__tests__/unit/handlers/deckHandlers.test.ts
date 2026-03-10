/**
 * Unit tests for deckHandlers — validates:
 *   - Auth check (no auth → unauthenticated)
 *   - Zod validation (missing/invalid fields → invalid-argument)
 *   - Service error mapping (permission-denied, not-found)
 *
 * All Firebase / service dependencies are mocked.
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

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentWritten: jest.fn(() => jest.fn()),
}));

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
  WriteBatch: jest.fn(),
}));

jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn() })),
}));

jest.mock("../../../src/ankiConverter", () => ({
  convertAnkiApkg: jest.fn(),
}));

jest.mock(
  "../../../src/repositories/firestore/FirestoreCardRepository",
  () => ({ FirestoreCardRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreDeckRepository",
  () => ({ FirestoreDeckRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreUserRepository",
  () => ({ FirestoreUserRepository: jest.fn().mockImplementation(() => ({})) })
);
jest.mock(
  "../../../src/repositories/firestore/FirestoreStatsRepository",
  () => ({ FirestoreStatsRepository: jest.fn().mockImplementation(() => ({})) })
);

jest.mock("../../../src/services/DeckService", () => ({
  DeckService: jest.fn().mockImplementation(() => ({
    createDeckWithCards: jest.fn().mockResolvedValue("deck-new-1"),
    copyDeck: jest.fn(),
    syncDeck: jest.fn(),
    resetDeck: jest.fn(),
    updateDeckSettings: jest.fn(),
    checkCardChanges: jest.fn().mockResolvedValue([]),
    syncCards: jest.fn().mockResolvedValue({ syncedCount: 0 }),
    updateDeck: jest.fn().mockResolvedValue({ updatedCount: 0, createdCount: 0, deletedCount: 0 }),
    updateCardContent: jest.fn(),
    toggleLike: jest.fn().mockResolvedValue({ liked: true, newLikeCount: 1 }),
    addCard: jest.fn().mockResolvedValue("card-new-1"),
    deleteDeck: jest.fn().mockResolvedValue({ notifiedUsers: 0 }),
    recordView: jest.fn(),
    addDeckEditor: jest.fn(),
    removeDeckEditor: jest.fn(),
  })),
}));

jest.mock("../../../src/services/LearnService", () => ({
  LearnService: jest.fn().mockImplementation(() => ({
    startLearningSession: jest.fn(),
  })),
}));

jest.mock("../../../src/services/StatsService", () => ({
  StatsService: jest.fn().mockImplementation(() => ({
    getDeckDailyStatsToday: jest.fn().mockResolvedValue(null),
    getUserDailyStatsToday: jest.fn().mockResolvedValue(null),
  })),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { DeckService } from "../../../src/services/DeckService";
import {
  createDeckWithCards,
  resetDeck,
  deleteDeck,
} from "../../../src/handlers/deckHandlers";

// Capture mock instances
let deckMock: Record<string, jest.Mock>;

beforeAll(() => {
  deckMock = (DeckService as jest.Mock).mock.results[0]?.value;
});

beforeEach(() => {
  jest.resetAllMocks();
  deckMock.createDeckWithCards.mockResolvedValue("deck-new-1");
  deckMock.resetDeck.mockResolvedValue(undefined);
  deckMock.deleteDeck.mockResolvedValue({ notifiedUsers: 0 });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuth(uid = "user-1") {
  return { uid, token: { email: "u@test.com" } };
}

// ── createDeckWithCards ───────────────────────────────────────────────────────

describe("createDeckWithCards handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (createDeckWithCards as Function)({ auth: null, data: {} })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when request data is missing required fields", async () => {
    await expect(
      (createDeckWithCards as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when deckData.title is missing", async () => {
    await expect(
      (createDeckWithCards as Function)({
        auth: makeAuth(),
        data: { deckData: {}, cards: [] },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("calls deckService and returns deckId for valid request", async () => {
    const result = await (createDeckWithCards as Function)({
      auth: makeAuth(),
      data: {
        deckData: { title: "My Deck", isPublic: false },
        cards: [{ cardData: { front: "Q", back: "A" } }],
      },
    });

    expect(deckMock.createDeckWithCards).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ deckId: "deck-new-1" });
  });

  it("maps permission-denied service error to HttpsError", async () => {
    deckMock.createDeckWithCards.mockRejectedValueOnce(
      new Error("permission-denied: Not allowed")
    );

    await expect(
      (createDeckWithCards as Function)({
        auth: makeAuth(),
        data: {
          deckData: { title: "My Deck", isPublic: false },
          cards: [],
        },
      })
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
});

// ── resetDeck ─────────────────────────────────────────────────────────────────

describe("resetDeck handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (resetDeck as Function)({ auth: null, data: { deckId: "d1" } })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when deckId is missing", async () => {
    await expect(
      (resetDeck as Function)({ auth: makeAuth(), data: {} })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });
});

// ── deleteDeck ────────────────────────────────────────────────────────────────

describe("deleteDeck handler", () => {
  it("throws unauthenticated when auth is missing", async () => {
    await expect(
      (deleteDeck as Function)({ auth: null, data: { deckId: "d1" } })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("maps not-found service error to HttpsError", async () => {
    deckMock.deleteDeck.mockRejectedValueOnce(new Error("not-found"));

    await expect(
      (deleteDeck as Function)({
        auth: makeAuth(),
        data: { deckId: "nonexistent" },
      })
    ).rejects.toMatchObject({ code: "not-found" });
  });
});
