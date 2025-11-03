/**
 * Tests for searchFunctions.ts
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  waitForFirestore,
} from "./helpers/testHelpers";
import { mockUserId } from "./helpers/mockData";

const db = admin.firestore();

let searchFunctions: typeof import("../src/searchFunctions");

describe("Search Functions", () => {
  beforeEach(async () => {
    searchFunctions = await import("../src/searchFunctions");
  });

  afterAll(() => {
    cleanup();
  });

  describe("searchDecks", () => {
    it("should search decks by title prefix", async () => {
      await createTestDeck("deck1", mockUserId, {
        title: "JavaScript Basics",
        isPublic: true,
      });
      await createTestDeck("deck2", mockUserId, {
        title: "Python Advanced",
        isPublic: true,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(searchFunctions.searchDecks);

      const result = await wrapped({
        data: { searchText: "JavaScript" },
      } as any);

      expect((result as any).results.length).toBeGreaterThan(0);
      expect((result as any).results[0].title).toContain("JavaScript");
    });

    it("should filter by isPublic", async () => {
      await createTestDeck("deck1", mockUserId, {
        title: "Public Deck",
        isPublic: true,
      });
      await createTestDeck("deck2", mockUserId, {
        title: "Private Deck",
        isPublic: false,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(searchFunctions.searchDecks);

      const result = await wrapped({
        data: {
          searchText: "Deck",
          filters: { isPublic: true },
        },
      } as any);

      (result as any).results.forEach((deck: any) => {
        expect(deck.isPublic).toBe(true);
      });
    });

    it("should log search when userId is provided", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(searchFunctions.searchDecks);

      await wrapped({
        data: {
          searchText: "test",
          userId: mockUserId,
        },
      } as any);

      // Verify search was logged
      const logsSnapshot = await db
        .collection(`users/${mockUserId}/searchLogs`)
        .where("searchText", "==", "test")
        .get();

      expect(logsSnapshot.size).toBeGreaterThan(0);
    });

    it("should respect limit", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestDeck(`deck-${i}`, mockUserId, {
          title: `Test Deck ${i}`,
          isPublic: true,
        });
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(searchFunctions.searchDecks);

      const result = await wrapped({
        data: { searchText: "Test", limit: 3 },
      } as any);

      expect((result as any).results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getSearchLogs", () => {
    it("should return user's search logs", async () => {
      await createTestUser(mockUserId);
      await db.doc(`users/${mockUserId}/searchLogs/log1`).set({
        searchText: "test search",
        filters: {},
        resultsCount: 5,
        timestamp: admin.firestore.Timestamp.now(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

      const result = await wrapped({ data: { userId: mockUserId } } as any);

      expect((result as any).length).toBeGreaterThan(0);
      expect((result as any)[0].searchText).toBe("test search");
    });

    it("should throw error when userId is missing", async () => {
      const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "userId is required"
      );
    });
  });
});
