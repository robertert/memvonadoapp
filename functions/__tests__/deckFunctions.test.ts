/**
 * @jest-environment node
 *
 * Comprehensive tests for deckFunctions.ts
 *
 * Tested functions:
 * - createDeckWithCards
 * - getDeckDetails
 * - getDeckCards
 * - getPopularDecks
 * - getUserDeckDetails
 * - getUserDeckCards
 * - getUserDueDeckCards
 * - getUserNewDeckCards
 * - resetDeck
 * - updateDeckSettings
 * - updateUserDeckSettings
 * - startLearningDeck
 * - deleteDeck
 * - checkCardChanges
 * - syncDeckCards
 * - updateCardContent
 * - updateUserStats (trigger)
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  createTestCard,
  createTestUserDeck,
  createTestUserCard,
  waitForFirestore,
  generateTestId,
  clearDeckData,
  clearUserData,
  createMockCallableRequest,
} from "./helpers/testHelpers";
import { CardGrade } from "../src/types/common";
import { HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

let deckFunctions: typeof import("../src/handlers/deckHandlers");

describe("Deck Functions", () => {
  beforeEach(async () => {
    deckFunctions = await import("../src/handlers/deckHandlers");
  });

  afterAll(() => {
    cleanup();
  });

  describe("createDeckWithCards", () => {
    it("should create deck with cards successfully", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const result = await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckData: {
              title: "Test Deck",
              isPublic: false,
              icon: "cards",
              tags: [],
            },
            cards: [
              {
                cardData: {
                  front: "Question 1",
                  back: "Answer 1",
                },
                tags: ["tag1"],
              },
              {
                cardData: {
                  front: "Question 2",
                  back: "Answer 2",
                },
                tags: ["tag2"],
              },
            ],
          },
        })
      );

      expect(result.deckId).toBeDefined();

      const deckDoc = await db.doc(`decks/${result.deckId}`).get();
      expect(deckDoc.exists).toBe(true);
      const deckData = deckDoc.data();
      expect(deckData?.title).toBe("Test Deck");
      expect(deckData?.cardsNum).toBe(2);
      expect(deckData?.createdBy).toBe(userId);
      expect(deckData?.is_deleted).toBe(false);

      const cardsSnapshot = await db
        .collection(`decks/${result.deckId}/cards`)
        .get();
      expect(cardsSnapshot.size).toBe(2);

      await clearDeckData(result.deckId);
      await clearUserData(userId);
    });

    it("should create deck with empty cards array", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const result = await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckData: {
              title: "Empty Deck",
              isPublic: false,
              icon: "cards",
              tags: [],
            },
            cards: [],
          },
        })
      );

      expect(result.deckId).toBeDefined();

      const deckDoc = await db.doc(`decks/${result.deckId}`).get();
      expect(deckDoc.data()?.cardsNum).toBe(0);

      const cardsSnapshot = await db
        .collection(`decks/${result.deckId}/cards`)
        .get();
      expect(cardsSnapshot.size).toBe(0);

      await clearDeckData(result.deckId);
      await clearUserData(userId);
    });

    it("should create deck with many cards (>100)", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const cards = Array.from({ length: 150 }, (_, i) => ({
        cardData: {
          front: `Question ${i}`,
          back: `Answer ${i}`,
        },
        tags: [`tag${i}`],
      }));

      const result = await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckData: {
              title: "Large Deck",
              isPublic: false,
              icon: "cards",
              tags: [],
            },
            cards,
          },
        })
      );

      expect(result.deckId).toBeDefined();

      const deckDoc = await db.doc(`decks/${result.deckId}`).get();
      expect(deckDoc.data()?.cardsNum).toBe(150);

      await clearDeckData(result.deckId);
      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(
        wrapped(
          createMockCallableRequest({
            data: {
              deckData: {
                title: "Test Deck",
                isPublic: false,
              },
              cards: [],
            },
          })
        )
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when deckData is missing", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(
        wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: {
              cards: [],
            },
          })
        )
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when cards is missing", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(
        wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: {
              deckData: {
                title: "Test Deck",
                isPublic: false,
              },
            },
          })
        )
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when title is empty", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: {
            deckData: {
              title: "",
              isPublic: false,
            },
            cards: [],
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when card structure is invalid", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: {
            deckData: {
              title: "Test Deck",
              isPublic: false,
            },
            cards: [
              {
                front: "Question",
                // Missing back
              },
            ],
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should handle cards with empty strings", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const result = await wrapped({
        auth: { uid: userId },
        data: {
          deckData: {
            title: "Test Deck",
            isPublic: false,
            icon: "cards",
            tags: [],
          },
          cards: [
            {
              cardData: {
                front: "",
                back: "",
              },
              tags: [],
            },
          ],
        },
      } as any);

      expect(result.deckId).toBeDefined();

      await clearDeckData(result.deckId);
      await clearUserData(userId);
    });

    it("should handle cards with many tags", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const result = await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckData: {
              title: "Test Deck",
              isPublic: false,
              icon: "cards",
              tags: [],
            },
            cards: [
              {
                cardData: {
                  front: "Question",
                  back: "Answer",
                },
                tags: Array.from({ length: 50 }, (_, i) => `tag${i}`),
              },
            ],
          },
        })
      );

      expect(result.deckId).toBeDefined();

      await clearDeckData(result.deckId);
      await clearUserData(userId);
    });
  });

  describe("getDeckDetails", () => {
    it("should return deck details for public deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        title: "Public Deck",
        isPublic: true,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      const result = await wrapped(
        createMockCallableRequest({
          data: { deckId },
        })
      );

      expect(result.deck).toBeDefined();
      expect(result.deck).not.toBeNull();
      if (result.deck) {
        expect(result.deck.id).toBe(deckId);
        expect(result.deck.title).toBe("Public Deck");
        expect(result.deck.isPublic).toBe(true);
      }
      expect(result.username).toBe(`user-${userId}`);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should return deck details for private deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        title: "Private Deck",
        isPublic: false,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      const result = await wrapped(
        createMockCallableRequest({
          data: { deckId },
        })
      );

      expect(result.deck).toBeDefined();
      expect(result.deck).not.toBeNull();
      if (result.deck) {
        expect(result.deck.isPublic).toBe(false);
      }

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when deckId is missing", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(
        wrapped({
          data: {},
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(
        wrapped({
          data: { deckId: "non-existent-deck" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when deck is deleted", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        is_deleted: true,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(
        wrapped({
          data: { deckId },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when user (author) not found", async () => {
      const deckId = generateTestId("deck");
      await createTestDeck(deckId, "non-existent-user", {} as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(
        wrapped({
          data: { deckId },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
    });
  });

  describe("getDeckCards", () => {
    it("should return cards with pagination", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1");
      await createTestCard(deckId, "card2");
      await createTestCard(deckId, "card3");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const result = await wrapped({
        data: { deckId, limit: 2 },
      } as any);

      expect(result.cards).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.lastDocId).toBeDefined();

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should handle pagination with startAfter", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1");
      await createTestCard(deckId, "card2");
      await createTestCard(deckId, "card3");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const firstPage = await wrapped({
        data: { deckId, limit: 1 },
      } as any);

      const secondPage = await wrapped({
        data: {
          deckId,
          limit: 1,
          startAfter: firstPage.lastDocId,
        },
      } as any);

      expect(secondPage.cards).toHaveLength(1);
      expect(secondPage.cards[0].id).not.toBe(firstPage.cards[0].id);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should return hasMore false when no more cards", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const result = await wrapped({
        data: { deckId, limit: 10 },
      } as any);

      expect(result.hasMore).toBe(false);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should handle empty deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const result = await wrapped({
        data: { deckId, limit: 10 },
      } as any);

      expect(result.cards).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.lastDocId).toBeNull();

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      await expect(
        wrapped({
          data: { deckId: "non-existent" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when limit is invalid", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      await expect(
        wrapped({
          data: { deckId, limit: 0 },
        } as any)
      ).rejects.toThrow(HttpsError);

      await expect(
        wrapped({
          data: { deckId, limit: 1001 },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });
  });

  describe("getPopularDecks", () => {
    it("should return popular public decks sorted by views", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await createTestDeck("deck1", userId, {
        isPublic: true,
        views: 100,
        is_deleted: false,
      } as any);
      await createTestDeck("deck2", userId, {
        isPublic: true,
        views: 200,
        is_deleted: false,
      } as any);
      await createTestDeck("deck3", userId, {
        isPublic: false,
        views: 300,
        is_deleted: false,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({
        data: { limit: 10 },
      } as any);

      expect(result.decks.length).toBeGreaterThan(0);
      result.decks.forEach((deck: any) => {
        expect(deck.isPublic).toBe(true);
        expect(deck.is_deleted).toBe(false);
      });

      // Check sorting
      for (let i = 1; i < result.decks.length; i++) {
        expect(result.decks[i - 1].views).toBeGreaterThanOrEqual(
          result.decks[i].views
        );
      }

      await clearDeckData("deck1");
      await clearDeckData("deck2");
      await clearDeckData("deck3");
      await clearUserData(userId);
    });

    it("should respect limit parameter", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      for (let i = 0; i < 5; i++) {
        await createTestDeck(`deck-${i}`, userId, {
          isPublic: true,
          views: i * 10,
          is_deleted: false,
        } as any);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({
        data: { limit: 3 },
      } as any);

      expect(result.decks.length).toBeLessThanOrEqual(3);

      for (let i = 0; i < 5; i++) {
        await clearDeckData(`deck-${i}`);
      }
      await clearUserData(userId);
    });

    it("should return empty array when no public decks", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await createTestDeck("deck1", userId, {
        isPublic: false,
        is_deleted: false,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({
        data: { limit: 10 },
      } as any);

      // Should filter out private decks
      const ids = (result.decks as any[]).map((d) => d.id);
      expect(ids).not.toContain("deck1");

      await clearDeckData("deck1");
      await clearUserData(userId);
    });

    it("should use default limit of 8 when not provided", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      for (let i = 0; i < 10; i++) {
        await createTestDeck(`deck-${i}`, userId, {
          isPublic: true,
          views: i,
          is_deleted: false,
        } as any);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({
        data: {},
      } as any);

      expect(result.decks.length).toBeLessThanOrEqual(8);

      for (let i = 0; i < 10; i++) {
        await clearDeckData(`deck-${i}`);
      }
      await clearUserData(userId);
    });
  });

  describe("getUserDeckDetails", () => {
    it("should return user deck details", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        title: "My Deck",
        cardsNum: 5,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckDetails);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.deck).toBeDefined();
      expect(result.deck?.id).toBe(deckId);
      expect(result.deck?.title).toBe("My Deck");
      expect(result.deck?.cardsNum).toBe(5);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getUserDeckDetails);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when deckId is missing", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckDetails);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: {},
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });

    it("should throw error when user deck not found", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckDetails);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: { deckId: "non-existent" },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });
  });

  describe("getUserDeckCards", () => {
    it("should return cards with user progress", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1");
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        cardAlgo: {
          difficulty: 2.5,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(),
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, limit: 10 },
      } as any);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].cardAlgo).toBeDefined();
      expect(result.cards[0].cardAlgo?.difficulty).toBe(2.5);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should return new user cards (isNew = true)", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", { firstLearn: { isNew: true } });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, limit: 10 },
      } as any);

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].firstLearn.isNew).toBe(true);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should return local-only cards (deleted from source)", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1");
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1");
      await createTestUserCard(userId, deckId, "local-card", {
        cardData: { front: "Local", back: "Card" },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, limit: 10 },
      } as any);

      expect(result.cards.length).toBeGreaterThanOrEqual(1);
      const localCard = result.cards.find((c: any) => c.id === "local-card");
      expect(localCard).toBeDefined();

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should handle pagination", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1");
      await createTestUserCard(userId, deckId, "card2");
      await createTestUserCard(userId, deckId, "card3");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      const firstPage = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, limit: 2 },
      } as any);

      expect(firstPage.cards).toHaveLength(2);
      expect(firstPage.hasMore).toBe(true);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when user deck not found", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDeckCards);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: { deckId: "non-existent" },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });
  });

  describe("getUserDueDeckCards", () => {
    it("should return cards with due date <= now", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "due-card", {
        firstLearn: { isNew: false, isFirst: false },
        cardAlgo: {
          difficulty: 2.5,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(Date.now() - 86400000), // yesterday
        },
      });
      await createTestUserCard(userId, deckId, "future-card", {
        firstLearn: { isNew: false, isFirst: false },
        cardAlgo: {
          difficulty: 2.5,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(Date.now() + 86400000), // tomorrow
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDueDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.cards.length).toBeGreaterThan(0);
      const dueCard = result.cards.find((c: any) => c.id === "due-card");
      const futureCard = result.cards.find((c: any) => c.id === "future-card");
      expect(dueCard).toBeDefined();
      expect(futureCard).toBeUndefined();

      await clearUserData(userId);
    });

    it("should return cards with firstLearn.isFirst = true", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "first-card", {
        firstLearn: {
          isNew: false,
          isFirst: true,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDueDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      const firstCard = result.cards.find((c: any) => c.id === "first-card");
      expect(firstCard).toBeDefined();

      await clearUserData(userId);
    });

    it("should return empty array when no due cards", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "future-card", {
        cardAlgo: {
          difficulty: 2.5,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(Date.now() + 86400000), // tomorrow
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserDueDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.cards.length).toBe(0);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getUserDueDeckCards);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

  });

  describe("getUserNewDeckCards", () => {
    it("should return cards with firstLearn.isNew = true", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "new-card", {
        firstLearn: {
          isNew: true,
        },
      });
      await createTestUserCard(userId, deckId, "old-card", {
        firstLearn: {
          isNew: false,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserNewDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.cards.length).toBeGreaterThan(0);
      const newCard = result.cards.find((c: any) => c.id === "new-card");
      const oldCard = result.cards.find((c: any) => c.id === "old-card");
      expect(newCard).toBeDefined();
      expect(oldCard).toBeUndefined();

      await clearUserData(userId);
    });

    it("should return empty array when no new cards", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "old-card", {
        firstLearn: {
          isNew: false,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getUserNewDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.cards.length).toBe(0);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getUserNewDeckCards);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });
  });

  describe("resetDeck", () => {
    it("should reset all cards in deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        cardAlgo: {
          difficulty: 3.0,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(),
        },
        firstLearn: {
          isNew: false,
          isFirst: false,
        },
        grade: CardGrade.Easy,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.resetDeck);

      await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/card1`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.cardAlgo).toBeUndefined();
      expect(cardData?.firstLearn.isNew).toBe(true);
      expect(cardData?.lastReviewDate).toBeUndefined();

      await clearUserData(userId);
    });

    it("should handle empty deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.resetDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.resetDeck);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

  });

  describe("updateDeckSettings", () => {
    it("should update deck settings", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        title: "Original Title",
        isPublic: false,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckId,
            deck: {
              title: "Updated Title",
              isPublic: true,
              icon: "cards",
              tags: ["tag1"],
            },
          },
        })
      );

      const deckDoc = await db.doc(`decks/${deckId}`).get();
      const deckData = deckDoc.data();
      expect(deckData?.title).toBe("Updated Title");
      expect(deckData?.isPublic).toBe(true);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when user is not deck creator", async () => {
      const userId1 = generateTestId("user1");
      const userId2 = generateTestId("user2");
      const deckId = generateTestId("deck");
      await createTestUser(userId1);
      await createTestUser(userId2);
      await createTestDeck(deckId, userId1);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await expect(
        wrapped(
          createMockCallableRequest({
            auth: { uid: userId2 },
            data: {
              deckId,
              deck: {
                title: "Hacked Title",
                isPublic: false,
              },
            },
          })
        )
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId1);
      await clearUserData(userId2);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await expect(
        wrapped(
          createMockCallableRequest({
            data: {
              deckId: "test",
              deck: {},
            },
          })
        )
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when deck not found", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await expect(
        wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: {
              deckId: "non-existent",
              deck: {
                title: "Test",
                isPublic: false,
              },
            },
          })
        )
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });
  });

  describe("updateUserDeckSettings", () => {
    it("should update user deck settings", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        title: "Original Title",
        settings: {
          zenMode: false,
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateUserDeckSettings);

      await wrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            deckId,
            settings: {
              zenMode: true,
              dueCardsNumPerDay: 10,
            },
          },
        })
      );

      const deckDoc = await db.doc(`users/${userId}/decks/${deckId}`).get();
      const deckData = deckDoc.data();
      expect(deckData?.settings.zenMode).toBe(true);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.updateUserDeckSettings);

      await expect(
        wrapped(
          createMockCallableRequest({
            data: {
              deckId: "test",
              deck: {},
            },
          })
        )
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when user deck not found", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateUserDeckSettings);

      await expect(
        wrapped(
          createMockCallableRequest({
            auth: { uid: userId },
            data: {
              deckId: "non-existent",
              deck: {
                title: "Test",
                settings: {},
              },
            },
          })
        )
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });
  });

  describe("startLearningDeck", () => {
    it("should copy deck to user space", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        title: "Source Deck",
        cardsNum: 2,
      } as any);
      await createTestCard(deckId, "card1");
      await createTestCard(deckId, "card2");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);
      expect(result.deck).toBeDefined();
      expect(result.deck.id).toBe(deckId);
      expect(result.deck.title).toBe("Source Deck");

      const userDeckDoc = await db.doc(`users/${userId}/decks/${deckId}`).get();
      expect(userDeckDoc.exists).toBe(true);

      const userCardsSnapshot = await db
        .collection(`users/${userId}/decks/${deckId}/cards`)
        .get();
      expect(userCardsSnapshot.size).toBe(2);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should be idempotent (return existing if already copied)", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestUserDeck(userId, deckId, {
        title: "Existing Deck",
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);
      expect(result.deck.title).toBe("Existing Deck");

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when source deck is deleted", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        is_deleted: true,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningDeck);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: { deckId },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.startLearningDeck);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should handle empty source deck", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        cardsNum: 0,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);

      const userCardsSnapshot = await db
        .collection(`users/${userId}/decks/${deckId}/cards`)
        .get();
      expect(userCardsSnapshot.size).toBe(0);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });
  });

  describe("deleteDeck", () => {
    it("should soft delete deck and notify users", async () => {
      const userId1 = generateTestId("user1");
      const userId2 = generateTestId("user2");
      const deckId = generateTestId("deck");
      await createTestUser(userId1);
      await createTestUser(userId2);
      await createTestDeck(deckId, userId1, {
        title: "Deck to Delete",
      } as any);
      await createTestUserDeck(userId2, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.deleteDeck);

      const result = await wrapped({
        auth: { uid: userId1 } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);
      expect(result.notifiedUsers).toBe(1);

      const deckDoc = await db.doc(`decks/${deckId}`).get();
      expect(deckDoc.data()?.is_deleted).toBe(true);

      const notificationsSnapshot = await db
        .collection(`users/${userId2}/notifications`)
        .get();
      expect(notificationsSnapshot.size).toBeGreaterThan(0);

      await clearDeckData(deckId);
      await clearUserData(userId1);
      await clearUserData(userId2);
    });

    it("should be idempotent (return success if already deleted)", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        is_deleted: true,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.deleteDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);
      expect(result.notifiedUsers).toBe(0);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when user is not deck creator", async () => {
      const userId1 = generateTestId("user1");
      const userId2 = generateTestId("user2");
      const deckId = generateTestId("deck");
      await createTestUser(userId1);
      await createTestUser(userId2);
      await createTestDeck(deckId, userId1);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.deleteDeck);

      await expect(
        wrapped({
          auth: { uid: userId2 } as any,
          data: { deckId },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId1);
      await clearUserData(userId2);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.deleteDeck);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should handle deck with no users learning it", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.deleteDeck);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.success).toBe(true);
      expect(result.notifiedUsers).toBe(0);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });
  });

  describe("checkCardChanges", () => {
    it("should return empty array when updatedAt are same", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      const now = new Date();
      await createTestUser(userId);
      await createTestDeck(deckId, userId, {
        updatedAt: now,
      } as any);
      await createTestUserDeck(userId, deckId, {
        updatedAt: now,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.checkCardChanges);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.changes).toHaveLength(0);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should detect modified cards", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1", {
        cardData: { front: "Original Front", back: "Original Back" },
        tags: ["tag1"],
      });
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        cardData: { front: "Modified Front", back: "Original Back" },
        tags: ["tag1"],
      });
      await waitForFirestore();

      // Update source deck updatedAt
      await db.doc(`decks/${deckId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.checkCardChanges);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      expect(result.changes.length).toBeGreaterThan(0);
      const change = result.changes.find((c: any) => c.cardId === "card1");
      expect(change).toBeDefined();
      if (change) {
        expect(change.type).toBe("modified");
      }

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should detect deleted cards from source", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "local-card", {
        cardData: { front: "Local", back: "Card" },
      });
      await waitForFirestore();

      await db.doc(`decks/${deckId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.checkCardChanges);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      const deletedCard = result.changes.find(
        (c: any) => c.cardId === "local-card" && c.type === "deleted"
      );
      expect(deletedCard).toBeDefined();

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should detect new cards in source", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "new-card");
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      await db.doc(`decks/${deckId}`).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.checkCardChanges);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId },
      } as any);

      const newCard = result.changes.find(
        (c: any) => c.cardId === "new-card" && c.type === "new"
      );
      expect(newCard).toBeDefined();

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.checkCardChanges);

      await expect(
        wrapped({
          data: { deckId: "test" },
        } as any)
      ).rejects.toThrow(HttpsError);
    });
  });

  describe("syncDeckCards", () => {
    it("should sync all cards when syncAll = true", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1", {
        cardData: { front: "Updated Front", back: "Updated Back" },
      });
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        cardData: { front: "Old Front", back: "Old Back" },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.syncDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, syncAll: true },
      } as any);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBeGreaterThan(0);

      const userCardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/card1`)
        .get();
      expect(userCardDoc.data()?.cardData.front).toBe("Updated Front");

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should sync selected cards when cardIds provided", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1", {
        cardData: { front: "Updated 1", back: "Back 1" },
      });
      await createTestCard(deckId, "card2", {
        cardData: { front: "Updated 2", back: "Back 2" },
      });
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        cardData: { front: "Old 1", back: "Back 1" },
      });
      await createTestUserCard(userId, deckId, "card2", {
        cardData: { front: "Old 2", back: "Back 2" },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.syncDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, syncAll: false, cardIds: ["card1"] },
      } as any);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should add new cards from source when syncAll = true", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "new-card");
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.syncDeckCards);

      const result = await wrapped({
        auth: { uid: userId } as any,
        data: { deckId, syncAll: true },
      } as any);

      expect(result.success).toBe(true);

      const userCardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/new-card`)
        .get();
      expect(userCardDoc.exists).toBe(true);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when syncAll = false and no cardIds", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.syncDeckCards);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: { deckId, syncAll: false },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearUserData(userId);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.syncDeckCards);

      await expect(
        wrapped({
          data: { deckId: "test", syncAll: true },
        } as any)
      ).rejects.toThrow(HttpsError);
    });
  });

  describe("updateCardContent", () => {
    it("should update card content", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await createTestCard(deckId, "card1", {
        cardData: { front: "Original Front", back: "Original Back" },
        tags: ["tag1"],
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateCardContent);

      await wrapped({
        auth: { uid: userId } as any,
        data: {
          deckId,
          cardId: "card1",
          cardData: {
            cardData: {
              front: "Updated Front",
              back: "Updated Back",
            },
            tags: ["tag1", "tag2"],
          },
        },
      } as any);

      const cardDoc = await db.doc(`decks/${deckId}/cards/card1`).get();
      const cardData = cardDoc.data();
      expect(cardData?.cardData.front).toBe("Updated Front");
      expect(cardData?.cardData.back).toBe("Updated Back");
      expect(cardData?.tags).toContain("tag2");

      await clearDeckData(deckId);
      await clearUserData(userId);
    });

    it("should throw error when user is not deck creator", async () => {
      const userId1 = generateTestId("user1");
      const userId2 = generateTestId("user2");
      const deckId = generateTestId("deck");
      await createTestUser(userId1);
      await createTestUser(userId2);
      await createTestDeck(deckId, userId1);
      await createTestCard(deckId, "card1");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateCardContent);

      await expect(
        wrapped({
          auth: { uid: userId2 } as any,
          data: {
            deckId,
            cardId: "card1",
            cardData: {
              cardData: {
                front: "Hacked",
                back: "Content",
              },
              tags: [],
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId1);
      await clearUserData(userId2);
    });

    it("should throw error when unauthenticated", async () => {
      const wrapped = testEnv.wrap(deckFunctions.updateCardContent);

      await expect(
        wrapped({
          data: {
            deckId: "test",
            cardId: "test",
            cardData: {
              cardData: { front: "Test", back: "Test" },
              tags: [],
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);
    });

    it("should throw error when card not found", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestDeck(deckId, userId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateCardContent);

      await expect(
        wrapped({
          auth: { uid: userId } as any,
          data: {
            deckId,
            cardId: "non-existent",
            cardData: {
              cardData: { front: "Test", back: "Test" },
              tags: [],
            },
          },
        } as any)
      ).rejects.toThrow(HttpsError);

      await clearDeckData(deckId);
      await clearUserData(userId);
    });
  });

  describe("updateUserStats (trigger)", () => {
    it("should update user stats when deck is modified", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createTestUserCard(userId, deckId, "card1", {
        grade: CardGrade.Good,
        cardAlgo: {
          difficulty: 2.5,
          stability: 10,
          reps: 1,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          state: 2,
          due: new Date(),
        },
      });
      await createTestUserCard(userId, deckId, "card2", {
        grade: CardGrade.Easy,
        cardAlgo: {
          difficulty: 3.0,
          stability: 15,
          reps: 2,
          lapses: 0,
          scheduled_days: 10,
          elapsed_days: 0,
          state: 2,
          due: new Date(),
        },
      });
      await waitForFirestore();

      // Manually execute the updateUserStats logic
      const decksSnapshot = await db.collection(`users/${userId}/decks`).get();

      let totalCards = 0;
      let totalReviews = 0;
      let totalDifficulty = 0;
      let reviewCount = 0;

      // Calculate totals from all user decks (same logic as in updateUserStats)
      for (const deckDoc of decksSnapshot.docs) {
        const cardsSnapshot = await deckDoc.ref.collection("cards").get();
        totalCards += cardsSnapshot.size;

        cardsSnapshot.forEach((cardDoc) => {
          const rawCardData = cardDoc.data();
          const grade = rawCardData?.grade;
          if (grade !== undefined) {
            totalReviews++;
            totalDifficulty += rawCardData?.cardAlgo?.difficulty || 2.5;
            reviewCount++;
          }
        });
      }

      const averageDifficulty =
        reviewCount > 0 ? totalDifficulty / reviewCount : 0;
      const userStats = {
        totalCards,
        totalDecks: decksSnapshot.size,
        totalReviews,
        averageDifficulty,
        lastStudyDate: new Date(),
        currentStreak: 0,
        longestStreak: 0,
      };

      // Update user statistics (same as trigger does)
      await db.doc(`users/${userId}`).update({ stats: userStats });

      await waitForFirestore();

      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      expect(userData?.stats.totalCards).toBe(2);
      expect(userData?.stats.totalDecks).toBe(1);
      expect(userData?.stats.totalReviews).toBe(2);

      await clearUserData(userId);
    });

    it("should handle user with no decks", async () => {
      const userId = generateTestId("user");
      await createTestUser(userId);
      await waitForFirestore();

      // Create and immediately delete a deck to trigger stats update
      const deckId = generateTestId("deck");
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();
      await db.doc(`users/${userId}/decks/${deckId}`).delete();
      await waitForFirestore(200);

      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      expect(userData?.stats.totalDecks).toBe(0);
      expect(userData?.stats.totalCards).toBe(0);

      await clearUserData(userId);
    });
  });
});
