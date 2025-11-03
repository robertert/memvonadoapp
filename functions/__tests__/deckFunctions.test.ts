/**
 * Tests for deckFunctions.ts
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestDeck,
  createTestCard,
  waitForFirestore,
} from "./helpers/testHelpers";
import { mockUserId, mockDeckId, mockCardId } from "./helpers/mockData";

const db = admin.firestore();

let deckFunctions: typeof import("../src/deckFunctions");

describe("Deck Functions", () => {
  beforeEach(async () => {
    deckFunctions = await import("../src/deckFunctions");
  });

  // Note: We don't clear data between tests here to avoid deleting data
  // that subsequent tests may need. Each test should be independent.

  afterAll(() => {
    cleanup();
  });

  describe("createDeckWithCards", () => {
    it("should create deck with cards", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const cards = [
        {
          front: "Question 1",
          back: "Answer 1",
          tags: ["tag1"],
        },
        {
          front: "Question 2",
          back: "Answer 2",
          tags: ["tag2"],
        },
      ];

      const result = await wrapped({
        data: {
          title: "Test Deck",
          cards,
          userId: mockUserId,
        },
      } as any);

      expect(result.deckId).toBeDefined();

      // Verify deck was created
      const deckDoc = await db.doc(`decks/${result.deckId}`).get();
      expect(deckDoc.exists).toBe(true);
      expect(deckDoc.data()?.title).toBe("Test Deck");
      expect(deckDoc.data()?.cardsNum).toBe(2);
      expect(deckDoc.data()?.createdBy).toBe(mockUserId);

      // Verify cards were created
      const cardsSnapshot = await db
        .collection(`decks/${result.deckId}/cards`)
        .get();
      expect(cardsSnapshot.size).toBe(2);

      // Verify deck was created (decks are queried by createdBy field, not stored in user.decks array)
      expect(result.deckId).toBeDefined();
    });

    it("should initialize default card values", async () => {
      await createTestUser(mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      const result = await wrapped({
        data: {
          title: "Test Deck",
          cards: [{ front: "Q", back: "A", tags: [] }],
          userId: mockUserId,
        },
      } as any);

      const cardsSnapshot = await db
        .collection(`decks/${result.deckId}/cards`)
        .get();
      const cardData = cardsSnapshot.docs[0].data();
      expect(cardData?.difficulty).toBe(2.5);
      expect(cardData?.grade).toBe(-1);
      expect(cardData?.nextReviewInterval).toBe(1);
    });

    it("should throw error when required parameters are missing", async () => {
      const wrapped = testEnv.wrap(deckFunctions.createDeckWithCards);

      await expect(wrapped({ data: { title: "Test" } } as any)).rejects.toThrow(
        "Title, cards, and userId are required"
      );
    });
  });

  describe("getDeckDetails", () => {
    it("should return deck details", async () => {
      await createTestDeck(mockDeckId, mockUserId, {
        title: "Test Deck",
        isPublic: true,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      const result = await wrapped({ data: { deckId: mockDeckId } } as any);

      expect((result as any).deck.id).toBe(mockDeckId);
      expect((result as any).deck.title).toBe("Test Deck");
      expect((result as any).deck.isPublic).toBe(true);
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(
        wrapped({ data: { deckId: "non-existent" } } as any)
      ).rejects.toThrow("Deck not found");
    });

    it("should throw error when deckId is missing", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckDetails);

      await expect(wrapped({ data: {} } as any)).rejects.toThrow(
        "deckId is required"
      );
    });
  });

  describe("getDeckCards", () => {
    it("should return deck cards with pagination", async () => {
      await createTestDeck(mockDeckId, mockUserId);

      // Create 3 cards
      await createTestCard(mockDeckId, "card1");
      await createTestCard(mockDeckId, "card2");
      await createTestCard(mockDeckId, "card3");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const result = await wrapped({
        data: { deckId: mockDeckId, limit: 2 },
      } as any);

      expect(result.cards).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.lastDocId).toBeDefined();
    });

    it("should handle pagination with startAfter", async () => {
      await createTestDeck(mockDeckId, mockUserId);

      await createTestCard(mockDeckId, "card1");
      await createTestCard(mockDeckId, "card2");
      await waitForFirestore();

      // Get first page
      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);
      const firstPage = await wrapped({
        data: { deckId: mockDeckId, limit: 1 },
      } as any);

      // Get second page
      const secondPage = await wrapped({
        data: {
          deckId: mockDeckId,
          limit: 1,
          startAfter: (firstPage as any).lastDocId,
        },
      } as any);

      expect((secondPage as any).cards).toHaveLength(1);
      expect((secondPage as any).cards[0].id).not.toBe(
        (firstPage as any).cards[0].id
      );
    });

    it("should return hasMore false when no more cards", async () => {
      await createTestDeck(mockDeckId, mockUserId);
      await createTestCard(mockDeckId, "card1");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      const result = await wrapped({
        data: { deckId: mockDeckId, limit: 10 },
      } as any);

      expect(result.hasMore).toBe(false);
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDeckCards);

      await expect(
        wrapped({ data: { deckId: "non-existent" } } as any)
      ).rejects.toThrow("Deck not found");
    });
  });

  describe("getDueDeckCards", () => {
    it("should return cards with due date in the past or now", async () => {
      await createTestDeck(mockDeckId, mockUserId);

      const duePast = new Date(Date.now() - 86400000); // yesterday
      const dueFuture = new Date(Date.now() + 86400000); // tomorrow

      await createTestCard(mockDeckId, "due-card", {
        cardAlgo: {
          difficulty: 2.5,
          stability: 0,
          reps: 0,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 0,
          last_review: admin.firestore.Timestamp.now() as any,
          state: 0,
          due: admin.firestore.Timestamp.fromDate(duePast) as any,
        },
      } as any);

      await createTestCard(mockDeckId, "future-card", {
        cardAlgo: {
          difficulty: 2.5,
          stability: 0,
          reps: 0,
          lapses: 0,
          scheduled_days: 1,
          elapsed_days: 0,
          last_review: admin.firestore.Timestamp.now() as any,
          state: 0,
          due: admin.firestore.Timestamp.fromDate(dueFuture) as any,
        },
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDueDeckCards);

      const result = await wrapped({
        data: { deckId: mockDeckId, limit: 10 },
      } as any);

      expect((result as any).cards.length).toBeGreaterThan(0);
      expect(
        (result as any).cards.find((c: any) => c.id === "future-card")
      ).toBeUndefined();
    });

    it("should respect limit parameter", async () => {
      await createTestDeck(mockDeckId, mockUserId);

      const duePast = new Date(Date.now() - 86400000);
      for (let i = 0; i < 5; i++) {
        await createTestCard(mockDeckId, `card-${i}`, {
          cardAlgo: {
            difficulty: 2.5,
            stability: 0,
            reps: 0,
            lapses: 0,
            scheduled_days: 1,
            elapsed_days: 0,
            last_review: admin.firestore.Timestamp.now() as any,
            state: 0,
            due: admin.firestore.Timestamp.fromDate(duePast) as any,
          },
        } as any);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getDueDeckCards);

      const result = await wrapped({
        data: { deckId: mockDeckId, limit: 2 },
      } as any);

      expect((result as any).cards.length).toBeLessThanOrEqual(2);
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getDueDeckCards);

      await expect(
        wrapped({ data: { deckId: "non-existent" } } as any)
      ).rejects.toThrow("Deck not found");
    });
  });

  describe("getNewDeckCards", () => {
    it("should return new cards that are due", async () => {
      await createTestDeck(mockDeckId, mockUserId);

      const duePast = new Date(Date.now() - 60000); // 1 min ago

      await createTestCard(mockDeckId, "new-card", {
        firstLearn: {
          isNew: true,
          due: admin.firestore.Timestamp.fromDate(duePast) as any,
          state: 0,
          consecutiveGood: 0,
        },
        grade: -1,
      } as any);

      await createTestCard(mockDeckId, "old-card", {
        firstLearn: {
          isNew: false,
          due: admin.firestore.Timestamp.fromDate(duePast) as any,
          state: 2,
          consecutiveGood: 1,
        },
        grade: 3,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getNewDeckCards);

      const result = await wrapped({
        data: { deckId: mockDeckId, limit: 10 },
      } as any);

      expect((result as any).cards.length).toBeGreaterThan(0);
      expect(
        (result as any).cards.find((c: any) => c.id === "old-card")
      ).toBeUndefined();
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.getNewDeckCards);

      await expect(
        wrapped({ data: { deckId: "non-existent" } } as any)
      ).rejects.toThrow("Deck not found");
    });
  });

  describe("getPopularDecks", () => {
    it("should return popular public decks sorted by views", async () => {
      await createTestDeck("deck1", mockUserId, {
        isPublic: true,
        views: 100,
      } as any);
      await createTestDeck("deck2", mockUserId, {
        isPublic: true,
        views: 200,
      } as any);
      await createTestDeck("deck3", mockUserId, {
        isPublic: false,
        views: 300,
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({ data: { limit: 10 } } as any);

      expect((result as any).decks.length).toBeGreaterThan(0);
      // Should only return public decks
      (result as any).decks.forEach((deck: any) => {
        expect(deck.isPublic).toBe(true);
      });
      // Should be sorted by views descending
      for (let i = 1; i < (result as any).decks.length; i++) {
        expect((result as any).decks[i - 1].views).toBeGreaterThanOrEqual(
          (result as any).decks[i].views
        );
      }
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestDeck(`deck-${i}`, mockUserId, {
          isPublic: true,
          views: i * 10,
        } as any);
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.getPopularDecks);

      const result = await wrapped({ data: { limit: 3 } } as any);

      expect((result as any).decks.length).toBeLessThanOrEqual(3);
    });
  });

  describe("resetDeck", () => {
    it("should reset all cards in deck", async () => {
      await createTestUser(mockUserId);
      await createTestDeck(mockDeckId, mockUserId);
      await createTestCard(mockDeckId, mockCardId, {
        grade: 5,
        difficulty: 3.0,
        cardAlgo: {
          difficulty: 3.0,
          stability: 10,
          reps: 5,
          lapses: 0,
          scheduled_days: 7,
          elapsed_days: 0,
          last_review: admin.firestore.Timestamp.now() as any,
          state: 2,
          due: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 86400000 * 7)
          ) as any,
        },
        firstLearn: {
          isNew: false,
          due: admin.firestore.Timestamp.now() as any,
          state: 2,
          consecutiveGood: 3,
        },
      } as any);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.resetDeck);

      await wrapped({
        data: { deckId: mockDeckId },
        auth: { uid: mockUserId } as any,
      } as any);

      const cardDoc = await db
        .doc(`decks/${mockDeckId}/cards/${mockCardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.cardAlgo).toBeUndefined();
      expect(cardData?.firstLearn).toBeUndefined();
      expect(cardData?.grade).toBe(-1);
      expect(cardData?.difficulty).toBe(2.5);
      expect(cardData?.nextReviewInterval).toBe(1);
    });

    it("should throw error when user doesn't have permission", async () => {
      await createTestUser(mockUserId);
      await createTestUser("other-user");
      await createTestDeck(mockDeckId, "other-user");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.resetDeck);

      await expect(
        wrapped({
          data: { deckId: mockDeckId },
          auth: { uid: mockUserId } as any,
        } as any)
      ).rejects.toThrow("User does not have permission");
    });
  });

  describe("updateDeckSettings", () => {
    it("should update deck settings", async () => {
      await createTestUser(mockUserId);
      await createTestDeck(mockDeckId, mockUserId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      const newSettings = {
        isPublic: true,
        allowComments: false,
      };

      const result = await wrapped({
        data: { deckId: mockDeckId, settings: newSettings },
        auth: { uid: mockUserId } as any,
      } as any);

      expect(result.success).toBe(true);

      const deckDoc = await db.doc(`decks/${mockDeckId}`).get();
      expect(deckDoc.data()?.settings?.isPublic).toBe(true);
      expect(deckDoc.data()?.settings?.allowComments).toBe(false);
    });

    it("should throw error when user doesn't have permission", async () => {
      await createTestUser(mockUserId);
      await createTestUser("other-user");
      await createTestDeck(mockDeckId, "other-user");
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await expect(
        wrapped({
          data: {
            deckId: mockDeckId,
            settings: {},
          },
          auth: { uid: mockUserId } as any,
        } as any)
      ).rejects.toThrow("User does not have permission");
    });

    it("should throw error when deck not found", async () => {
      const wrapped = testEnv.wrap(deckFunctions.updateDeckSettings);

      await expect(
        wrapped({
          data: {
            deckId: "non-existent",
            settings: {},
          },
          auth: { uid: mockUserId } as any,
        } as any)
      ).rejects.toThrow("Deck not found");
    });
  });
});
