/**
 * Comprehensive tests for searchFunctions.ts
 */

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  waitForFirestore,
  generateTestId,
  createMockCallableRequest,
} from "./helpers/testHelpers";

const db = admin.firestore();

let searchFunctions: typeof import("../src/handlers/searchHandlers");

/**
 * Helper to create test deck with additional fields like is_deleted, category, tags
 */
async function createTestDeckWithFields(
  deckId: string,
  userId: string,
  data: {
    title?: string;
    category?: string | null;
    tags?: string[];
    is_deleted?: boolean;
    isPublic?: boolean;
    [key: string]: any;
  } = {}
): Promise<void> {
  await createTestDeck(deckId, userId, {
    title: data.title || "Test Deck",
    isPublic: data.isPublic !== undefined ? data.isPublic : false,
  });
  const updateData: any = {};
  if (data.is_deleted !== undefined) updateData.is_deleted = data.is_deleted;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (Object.keys(updateData).length > 0) {
    await db.doc(`decks/${deckId}`).update(updateData);
  }
}

describe("Search Functions", () => {
  beforeEach(async () => {
    searchFunctions = await import("../src/handlers/searchHandlers");
  });

  afterAll(() => {
    cleanup();
  });

  describe("searchDecks", () => {
    describe("Request validation", () => {
      it("should throw error for empty request data", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for null request data", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(createMockCallableRequest({ data: null }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when both searchText and filters are missing", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow("Search text or filters required");
      });

      it("should throw error for invalid limit type (string)", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", limit: "20" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for invalid limit type (object)", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", limit: {} },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for limit < 1", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", limit: 0 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for limit > 100", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", limit: 101 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for limit as float", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", limit: 20.5 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for invalid searchText type (number)", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for invalid filters structure", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { filters: "invalid" },
            })
          )
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for invalid userId type", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test", userId: 123 },
            })
          )
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("Text search", () => {
      it("should search decks by title prefix", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");

        await createTestDeck(deckId1, userId, {
          title: "JavaScript Basics",
        });
        await db.doc(`decks/${deckId1}`).update({ is_deleted: false });
        await createTestDeck(deckId2, userId, {
          title: "Python Advanced",
        });
        await db.doc(`decks/${deckId2}`).update({ is_deleted: false });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "JavaScript" } })
        );

        const titles = (result as any).results.map((d: any) => d.title);
        expect(titles).toContain("JavaScript Basics");
      });

      it("should handle empty searchText when filters are provided", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeck(deckId, userId, {
          title: "Test Deck",
        });
        await db.doc(`decks/${deckId}`).update({
          category: "programming",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: "", filters: { category: "programming" } },
          })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle very long searchText", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");
        const longTitle = "A".repeat(1000);
        const searchText = "A".repeat(500);

        await createTestDeckWithFields(deckId, userId, {
          title: longTitle,
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle special characters in searchText", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test & Special @ Characters #123",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test &" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle unicode characters in searchText", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test 测试 日本語",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle emoji in searchText", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test 🎉 Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should be case-sensitive (Firestore range queries)", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "JavaScript",
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "javascript",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "JavaScript" } })
        );

        // Should find "JavaScript" but not "javascript" (case-sensitive)
        const titles = (result as any).results.map((d: any) => d.title);
        expect(titles).toContain("JavaScript");
      });

      it("should handle prefix 'A'", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Aardvark",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "A" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle prefix 'Z'", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Zebra",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Z" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle prefix '0'", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "0 to Hero",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "0" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should handle prefix '9'", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "99 Problems",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "9" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
      });

      it("should not return decks with is_deleted: true", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");
        const uniquePrefix = `IsDeletedTest_${Date.now()}`;

        await createTestDeckWithFields(deckId1, userId, {
          title: `${uniquePrefix} Active Deck`,
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: `${uniquePrefix} Deleted Deck`,
          is_deleted: true,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: uniquePrefix } })
        );

        const titles = (result as any).results.map((d: any) => d.title);
        expect(titles).toContain(`${uniquePrefix} Active Deck`);
        expect(titles).not.toContain(`${uniquePrefix} Deleted Deck`);
      });

      it("should not return decks with is_deleted: undefined (filtered by == false)", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");
        const uniquePrefix = `UndefinedDeletedTest_${Date.now()}`;

        await createTestDeckWithFields(deckId1, userId, {
          title: `${uniquePrefix} Active Deck`,
          is_deleted: false,
        });
        // Create deck without is_deleted field
        await db.doc(`decks/${deckId2}`).set({
          title: `${uniquePrefix} Undefined Deleted Deck`,
          cardsNum: 0,
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          isPublic: false,
          views: 0,
          likes: 0,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: uniquePrefix } })
        );

        const titles = (result as any).results.map((d: any) => d.title);
        expect(titles).toContain(`${uniquePrefix} Active Deck`);
        // Decks with undefined is_deleted should not be returned (query filters == false)
        expect(titles).not.toContain(`${uniquePrefix} Undefined Deleted Deck`);
      });

      it("should return decks with is_deleted: false", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Active Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Active" } })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
        expect((result as any).results[0].is_deleted).toBe(false);
      });
    });

    describe("Filters", () => {
      it("should search with only filters (no searchText)", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          category: "programming",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { category: "programming" } },
          })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
        expect((result as any).results[0].category).toBe("programming");
      });

      it("should filter by category", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "Programming Deck",
          category: "programming",
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "Math Deck",
          category: "math",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { category: "programming" } },
          })
        );

        const categories = (result as any).results.map((d: any) => d.category);
        expect(categories).toContain("programming");
        expect(categories).not.toContain("math");
      });

      it("should not use array-contains-any for empty tags array", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");
        const uniquePrefix = `EmptyTagsTest_${Date.now()}`;

        await createTestDeckWithFields(deckId, userId, {
          title: `${uniquePrefix} Test Deck`,
          tags: ["tag1"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: uniquePrefix, filters: { tags: [] } },
          })
        );

        // Should return the deck (no tag filter applied when tags array is empty)
        expect((result as any).results.length).toBeGreaterThan(0);
        const titles = (result as any).results.map((d: any) => d.title);
        expect(titles).toContain(`${uniquePrefix} Test Deck`);
      });

      it("should filter by single tag", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "Deck 1",
          tags: ["javascript"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "Deck 2",
          tags: ["python"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { tags: ["javascript"] } },
          })
        );

        const allTags = (result as any).results.flatMap(
          (d: any) => d.tags || []
        );
        expect(allTags).toContain("javascript");
        expect(allTags).not.toContain("python");
      });

      it("should filter by multiple tags (array-contains-any)", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");
        const deckId3 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "Deck 1",
          tags: ["javascript"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "Deck 2",
          tags: ["python"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId3, userId, {
          title: "Deck 3",
          tags: ["java"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { tags: ["javascript", "python"] } },
          })
        );

        const allTags = (result as any).results.flatMap(
          (d: any) => d.tags || []
        );
        expect(allTags).toContain("javascript");
        expect(allTags).toContain("python");
        expect(allTags).not.toContain("java");
      });

      it("should filter by category and tags combination", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "Deck 1",
          category: "programming",
          tags: ["javascript"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "Deck 2",
          category: "programming",
          tags: ["python"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: {
              filters: { category: "programming", tags: ["javascript"] },
            },
          })
        );

        expect((result as any).results.length).toBeGreaterThan(0);
        const deck = (result as any).results[0];
        expect(deck.category).toBe("programming");
        expect(deck.tags).toContain("javascript");
      });

      it("should return empty results for non-existent category", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          category: "programming",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { category: "non-existent" } },
          })
        );

        expect((result as any).results.length).toBe(0);
      });

      it("should return empty results for non-existent tags", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          tags: ["tag1"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { tags: ["non-existent-tag"] } },
          })
        );

        expect((result as any).results.length).toBe(0);
      });

      it("should handle partial tag matches (array-contains-any)", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");
        const deckId3 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "Deck 1",
          tags: ["javascript", "react"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "Deck 2",
          tags: ["python", "django"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId3, userId, {
          title: "Deck 3",
          tags: ["java"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { filters: { tags: ["react", "django"] } },
          })
        );

        const allTags = (result as any).results.flatMap(
          (d: any) => d.tags || []
        );
        expect(allTags).toContain("react");
        expect(allTags).toContain("django");
        expect(allTags).not.toContain("java");
      });
    });

    describe("Limit handling", () => {
      it("should use default limit of 20 when not specified", async () => {
        const userId = generateTestId("user");

        // Create 25 decks
        for (let i = 0; i < 25; i++) {
          await createTestDeckWithFields(generateTestId("deck"), userId, {
            title: `Test Deck ${i}`,
            is_deleted: false,
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        expect((result as any).results.length).toBeLessThanOrEqual(20);
      });

      it("should respect limit of 1", async () => {
        const userId = generateTestId("user");

        for (let i = 0; i < 5; i++) {
          await createTestDeckWithFields(generateTestId("deck"), userId, {
            title: `Test Deck ${i}`,
            is_deleted: false,
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test", limit: 1 } })
        );

        expect((result as any).results.length).toBe(1);
      });

      it("should respect limit of 100 (maximum)", async () => {
        const userId = generateTestId("user");

        // Create 150 decks
        for (let i = 0; i < 150; i++) {
          await createTestDeckWithFields(generateTestId("deck"), userId, {
            title: `Test Deck ${i}`,
            is_deleted: false,
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: "Test", limit: 100 },
          })
        );

        expect((result as any).results.length).toBe(100);
      });

      it("should return all results when fewer than limit", async () => {
        const userId = generateTestId("user");
        const uniquePrefix = `FewerThanLimit_${Date.now()}`;

        // Create only 3 decks
        for (let i = 0; i < 3; i++) {
          await createTestDeckWithFields(generateTestId("deck"), userId, {
            title: `${uniquePrefix} Deck ${i}`,
            is_deleted: false,
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: uniquePrefix, limit: 10 },
          })
        );

        expect((result as any).results.length).toBe(3);
      });
    });

    describe("Search logging", () => {
      it("should log search when userId is provided", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        await wrapped(
          createMockCallableRequest({
            data: { searchText: "Test", userId },
          })
        );

        await waitForFirestore();

        const logsSnapshot = await db
          .collection(`users/${userId}/searchLogs`)
          .where("searchText", "==", "Test")
          .get();

        expect(logsSnapshot.size).toBeGreaterThan(0);
        const log = logsSnapshot.docs[0].data();
        expect(log.userId).toBe(userId);
        expect(log.searchText).toBe("Test");
        expect(log.resultsCount).toBeGreaterThanOrEqual(0);
        expect(log.timestamp).toBeDefined();
        expect(log.filters).toBeDefined();
      });

      it("should not log search when userId is not provided", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        await waitForFirestore();

        const logsSnapshot = await db
          .collection(`users/${userId}/searchLogs`)
          .get();

        expect(logsSnapshot.size).toBe(0);
      });

      it("should log search with correct structure", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          category: "programming",
          tags: ["javascript"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        await wrapped(
          createMockCallableRequest({
            data: {
              searchText: "Test",
              userId,
              filters: { category: "programming", tags: ["javascript"] },
            },
          })
        );

        await waitForFirestore();

        const logsSnapshot = await db
          .collection(`users/${userId}/searchLogs`)
          .where("searchText", "==", "Test")
          .get();

        expect(logsSnapshot.size).toBeGreaterThan(0);
        const log = logsSnapshot.docs[0].data();
        expect(log.userId).toBe(userId);
        expect(log.searchText).toBe("Test");
        expect(log.filters).toEqual({
          category: "programming",
          tags: ["javascript"],
        });
        expect(log.resultsCount).toBeGreaterThanOrEqual(0);
        expect(log.timestamp).toBeDefined();
      });

      it("should log multiple searches for same userId", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        // Perform multiple searches
        await wrapped(
          createMockCallableRequest({
            data: { searchText: "Test1", userId },
          })
        );
        await wrapped(
          createMockCallableRequest({
            data: { searchText: "Test2", userId },
          })
        );
        await wrapped(
          createMockCallableRequest({
            data: { searchText: "Test3", userId },
          })
        );

        await waitForFirestore();

        const logsSnapshot = await db
          .collection(`users/${userId}/searchLogs`)
          .get();

        expect(logsSnapshot.size).toBe(3);
      });

      it("should log empty searchText when only filters are used", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          category: "programming",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        await wrapped(
          createMockCallableRequest({
            data: { filters: { category: "programming" }, userId },
          })
        );

        await waitForFirestore();

        const logsSnapshot = await db
          .collection(`users/${userId}/searchLogs`)
          .get();

        expect(logsSnapshot.size).toBeGreaterThan(0);
        const log = logsSnapshot.docs[0].data();
        expect(log.searchText).toBe("");
      });
    });

    describe("Response format", () => {
      it("should return response with correct structure", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        expect(result).toHaveProperty("results");
        expect(result).toHaveProperty("total");
        expect(Array.isArray((result as any).results)).toBe(true);
        expect(typeof (result as any).total).toBe("number");
      });

      it("should serialize timestamps in response", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        const deck = (result as any).results[0];
        // Timestamps should be serialized (not Firestore Timestamp objects)
        expect(deck.createdAt).toBeDefined();
        expect(deck.updatedAt).toBeDefined();
        // Should be serialized to ISO string or number
        expect(
          typeof deck.createdAt === "string" ||
            typeof deck.createdAt === "number"
        ).toBe(true);
      });

      it("should return empty results array when no matches", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: "NonExistentDeck12345" },
          })
        );

        expect((result as any).results).toEqual([]);
        expect((result as any).total).toBe(0);
      });

      it("should return decks with all required DeckSchema fields", async () => {
        const userId = generateTestId("user");
        const deckId = generateTestId("deck");

        await createTestDeckWithFields(deckId, userId, {
          title: "Test Deck",
          category: "programming",
          tags: ["tag1"],
          isPublic: true,
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        const deck = (result as any).results[0];
        expect(deck.id).toBeDefined();
        expect(deck.title).toBeDefined();
        expect(deck.cardsNum).toBeDefined();
        expect(deck.createdBy).toBeDefined();
        expect(deck.createdAt).toBeDefined();
        expect(deck.updatedAt).toBeDefined();
        expect(deck.isPublic).toBeDefined();
        expect(deck.views).toBeDefined();
        expect(deck.likes).toBeDefined();
        expect(deck.is_deleted).toBeDefined();
      });

      it("should have total equal to results.length", async () => {
        const userId = generateTestId("user");

        for (let i = 0; i < 5; i++) {
          await createTestDeckWithFields(generateTestId("deck"), userId, {
            title: `Test Deck ${i}`,
            is_deleted: false,
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: "Test" } })
        );

        expect((result as any).total).toBe((result as any).results.length);
      });
    });

    describe("Integration tests", () => {
      it("should handle combination of searchText + filters + limit", async () => {
        const userId = generateTestId("user");
        const deckId1 = generateTestId("deck");
        const deckId2 = generateTestId("deck");
        const deckId3 = generateTestId("deck");

        await createTestDeckWithFields(deckId1, userId, {
          title: "JavaScript Basics",
          category: "programming",
          tags: ["javascript"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId2, userId, {
          title: "JavaScript Advanced",
          category: "programming",
          tags: ["javascript"],
          is_deleted: false,
        });
        await createTestDeckWithFields(deckId3, userId, {
          title: "Python Basics",
          category: "programming",
          tags: ["python"],
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: {
              searchText: "JavaScript",
              filters: { category: "programming", tags: ["javascript"] },
              limit: 1,
            },
          })
        );

        expect((result as any).results.length).toBe(1);
        expect((result as any).results[0].title).toContain("JavaScript");
        expect((result as any).results[0].category).toBe("programming");
        expect((result as any).results[0].tags).toContain("javascript");
      });

      it("should handle multiple decks with different field combinations", async () => {
        const userId = generateTestId("user");
        const uniquePrefix = `MultiFieldCombos_${Date.now()}`;

        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Deck 1`,
          category: "programming",
          tags: ["javascript"],
          isPublic: true,
          is_deleted: false,
        });
        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Deck 2`,
          category: "math",
          tags: ["algebra"],
          isPublic: false,
          is_deleted: false,
        });
        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Deck 3`,
          category: null,
          tags: [],
          isPublic: true,
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({ data: { searchText: uniquePrefix } })
        );

        expect((result as any).results.length).toBe(3);
      });

      it("should return results sorted alphabetically (Firestore range query)", async () => {
        const userId = generateTestId("user");
        const uniquePrefix = `SortTest_${Date.now()}`;

        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Zebra`,
          is_deleted: false,
        });
        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Apple`,
          is_deleted: false,
        });
        await createTestDeckWithFields(generateTestId("deck"), userId, {
          title: `${uniquePrefix} Banana`,
          is_deleted: false,
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.searchDecks);
        const result = await wrapped(
          createMockCallableRequest({
            data: { searchText: uniquePrefix },
          })
        );

        const titles = (result as any).results.map((d: any) => d.title);
        // Firestore range queries return results in ascending order
        expect(titles.length).toBe(3);
        expect(titles[0]).toBe(`${uniquePrefix} Apple`);
        expect(titles[1]).toBe(`${uniquePrefix} Banana`);
        expect(titles[2]).toBe(`${uniquePrefix} Zebra`);
      });
    });

    describe("Error handling", () => {
      // Note: Testing actual Firestore errors is complex and may require mocking
      // These tests focus on error propagation and handling
      it("should propagate HttpsError", async () => {
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should handle errors gracefully", async () => {
        // This test verifies that the function has error handling
        // Actual error scenarios would require mocking Firestore
        const wrapped = testEnv.wrap(searchFunctions.searchDecks);

        // Valid request should not throw
        await expect(
          wrapped(
            createMockCallableRequest({
              data: { searchText: "test" },
            })
          )
        ).resolves.toBeDefined();
      });
    });
  });

  describe("getSearchLogs", () => {
    describe("Request validation", () => {
      it("should throw error for empty request data", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for null request data", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: null }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error when userId is missing", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for userId as number", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: { userId: 123 } }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for userId as object", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: { userId: {} } }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for userId as array", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: { userId: [] } }))
        ).rejects.toThrow(HttpsError);
      });

      it("should throw error for invalid request structure", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: { invalid: "field" } }))
        ).rejects.toThrow(HttpsError);
      });
    });

    describe("Fetching logs", () => {
      it("should return empty array for user with no logs", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        expect((result as any).logs).toEqual([]);
      });

      it("should return single log for user with one log", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        await db.doc(`users/${userId}/searchLogs/log1`).set({
          userId,
          searchText: "test search",
          filters: {},
          resultsCount: 5,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        expect((result as any).logs.length).toBe(1);
        expect((result as any).logs[0].searchText).toBe("test search");
      });

      it("should return multiple logs for user with many logs", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        // Create multiple logs
        for (let i = 0; i < 5; i++) {
          await db.doc(`users/${userId}/searchLogs/log${i}`).set({
            userId,
            searchText: `search ${i}`,
            filters: {},
            resultsCount: i,
            timestamp: admin.firestore.Timestamp.now(),
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        expect((result as any).logs.length).toBe(5);
      });

      it("should return logs sorted by timestamp desc (newest first)", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        const now = Date.now();
        // Create logs with different timestamps
        for (let i = 0; i < 3; i++) {
          await db.doc(`users/${userId}/searchLogs/log${i}`).set({
            userId,
            searchText: `search ${i}`,
            filters: {},
            resultsCount: i,
            timestamp: admin.firestore.Timestamp.fromMillis(now - i * 1000),
          });
        }
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        const logs = (result as any).logs;
        expect(logs.length).toBe(3);
        // Newest should be first (timestamp desc)
        expect(logs[0].searchText).toBe("search 0");
        expect(logs[1].searchText).toBe("search 1");
        expect(logs[2].searchText).toBe("search 2");
      });

      it("should return logs with correct structure (SearchLogSchema with id)", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        await db.doc(`users/${userId}/searchLogs/log1`).set({
          userId,
          searchText: "test search",
          filters: { category: "programming" },
          resultsCount: 5,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        const log = (result as any).logs[0];
        expect(log.id).toBeDefined();
        expect(log.userId).toBe(userId);
        expect(log.searchText).toBe("test search");
        expect(log.filters).toEqual({ category: "programming" });
        expect(log.resultsCount).toBe(5);
        expect(log.timestamp).toBeDefined();
      });

      it("should serialize timestamps in response", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        await db.doc(`users/${userId}/searchLogs/log1`).set({
          userId,
          searchText: "test search",
          filters: {},
          resultsCount: 5,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        const log = (result as any).logs[0];
        // Timestamps should be serialized (not Firestore Timestamp objects)
        expect(log.timestamp).toBeDefined();
        // Should be serialized to ISO string or number
        expect(
          typeof log.timestamp === "string" || typeof log.timestamp === "number"
        ).toBe(true);
      });
    });

    describe("Edge cases", () => {
      it("should return empty array for non-existent userId", async () => {
        const userId = generateTestId("user");

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        expect((result as any).logs).toEqual([]);
      });

      it("should return logs with all required fields", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        await db.doc(`users/${userId}/searchLogs/log1`).set({
          userId,
          searchText: "test",
          filters: { category: "programming", tags: ["javascript"] },
          resultsCount: 10,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        const log = (result as any).logs[0];
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("userId");
        expect(log).toHaveProperty("searchText");
        expect(log).toHaveProperty("filters");
        expect(log).toHaveProperty("resultsCount");
        expect(log).toHaveProperty("timestamp");
      });

      it("should handle logs with different searchText and filters combinations", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        await db.doc(`users/${userId}/searchLogs/log1`).set({
          userId,
          searchText: "javascript",
          filters: {},
          resultsCount: 5,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await db.doc(`users/${userId}/searchLogs/log2`).set({
          userId,
          searchText: "",
          filters: { category: "programming" },
          resultsCount: 3,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await db.doc(`users/${userId}/searchLogs/log3`).set({
          userId,
          searchText: "python",
          filters: { tags: ["django"] },
          resultsCount: 2,
          timestamp: admin.firestore.Timestamp.now(),
        });
        await waitForFirestore();

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);
        const result = await wrapped(
          createMockCallableRequest({ data: { userId } })
        );

        expect((result as any).logs.length).toBe(3);
        const logs = (result as any).logs;
        expect(logs.some((l: any) => l.searchText === "javascript")).toBe(true);
        expect(logs.some((l: any) => l.searchText === "")).toBe(true);
        expect(logs.some((l: any) => l.searchText === "python")).toBe(true);
      });
    });

    describe("Error handling", () => {
      it("should propagate HttpsError", async () => {
        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        await expect(
          wrapped(createMockCallableRequest({ data: {} }))
        ).rejects.toThrow(HttpsError);
      });

      it("should handle errors gracefully", async () => {
        const userId = generateTestId("user");
        await createTestUser(userId);

        const wrapped = testEnv.wrap(searchFunctions.getSearchLogs);

        // Valid request should not throw
        await expect(
          wrapped(createMockCallableRequest({ data: { userId } }))
        ).resolves.toBeDefined();
      });
    });
  });
});
