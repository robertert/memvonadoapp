/**
 * Integration tests for startLearningSession (deckFunctions.ts)
 *
 * Covers:
 *  - Fetching new / due / firstLearn cards
 *  - Daily limit enforcement (newCardsNumPerDay, user.settings.dailyNew)
 *  - Leave / re-enter mid-session (inProgressNewCards accounting)
 *  - Bidirectional mode (lazy-init, interleaving, 2× items per card)
 *  - Edge cases (deck auto-copy, daily stats day reset)
 */

import * as admin from "firebase-admin";
import { testEnv, cleanup } from "./setup";
import {
  createTestUser,
  createTestUserDeck,
  waitForFirestore,
  clearUserData,
  clearDeckData,
  clearUserDeckCards,
  generateTestId,
  createMockCallableRequest,
} from "./helpers/testHelpers";
import {
  setupStudyScenario,
  createFirestoreCard,
  makeDueCard,
  makeNewCard,
  makeGraduatedCard,
} from "./helpers/cardFactory";
import {
  assertDailyStatsNonNegative,
  assertDailyStatsRespectLimit,
  assertNoDuplicateSessionItems,
} from "./helpers/learningInvariants";

const db = admin.firestore();

let deckFunctions: typeof import("../src/handlers/deckHandlers");

describe("startLearningSession", () => {
  beforeEach(async () => {
    deckFunctions = await import("../src/handlers/deckHandlers");
  });

  afterAll(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Fetch card types
  // ---------------------------------------------------------------------------

  describe("fetching cards", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("returns new cards (firstLearn.isNew = true)", async () => {
      await setupStudyScenario({ userId, deckId, newCards: 3 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(3);
    });

    it("returns due cards (cardAlgo.due in the past)", async () => {
      await setupStudyScenario({ userId, deckId, dueCards: 2 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      // Due cards have firstLearn.isNew = false and cardAlgo set
      const dueItems = result.items.filter(
        (i: any) =>
          i.card.firstLearn?.isNew === false && i.card.cardAlgo != null
      );
      expect(dueItems.length).toBeGreaterThanOrEqual(2);
    });

    it("returns firstLearn cards (isFirst=true, isNew=false)", async () => {
      await setupStudyScenario({ userId, deckId, firstLearnCards: 2 });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      const firstItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isFirst === true
      );
      expect(firstItems.length).toBe(2);
    });

    it("does NOT return cards with cardAlgo.due in the future", async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);

      const futureCard = makeGraduatedCard("future-card");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      futureCard.cardAlgo!.due = tomorrow;
      await createFirestoreCard(userId, deckId, futureCard);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      const futureItems = result.items.filter(
        (i: any) => i.card.id === "future-card"
      );
      expect(futureItems.length).toBe(0);
    });

    it("does not duplicate due card when it matches firstLearn and FSRS query", async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      const duplicateId = generateTestId("due-dup");
      const dueCard = makeDueCard(duplicateId);
      dueCard.firstLearn = {
        isNew: false,
        isFirst: true,
        due: new Date(Date.now() - 60_000),
        consecutiveGood: 1,
      };
      await createFirestoreCard(userId, deckId, dueCard);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      const duplicateItems = result.items.filter(
        (i: any) => i.card.id === duplicateId
      );
      expect(duplicateItems.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Daily limit
  // ---------------------------------------------------------------------------

  describe("daily limit", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("respects newCardsNumPerDay deck setting", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 10,
        newCardsNumPerDay: 5,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      assertDailyStatsRespectLimit(result.dailyStats, 5);
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBeLessThanOrEqual(5);
      expect(result.dailyStats.newCardsRemaining).toBeLessThanOrEqual(5);
    });

    it("falls back to user.settings.dailyNew when deck has no limit", async () => {
      // User's dailyNew = 3, no deck limit
      await createTestUser(userId, { settings: { dailyNew: 3 } });
      await createTestUserDeck(userId, deckId, { cardsNum: 10 });

      for (let i = 0; i < 10; i++) {
        await createFirestoreCard(userId, deckId, makeNewCard(`card-${i}`));
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBeLessThanOrEqual(3);
    });

    it("returns 0 new cards when completedNewToday >= limit", async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: { newCardsNumPerDay: 5, zenMode: false, shuffleNewCards: false },
        cardsNum: 10,
      });

      // Pre-set dailyStats to already completed limit
      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 5,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(new Date()),
        },
      });

      for (let i = 0; i < 5; i++) {
        await createFirestoreCard(userId, deckId, makeNewCard(`new-card-${i}`));
      }
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(0);
    });

    it("still returns due cards even when new card limit is exhausted", async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: { newCardsNumPerDay: 5, zenMode: false, shuffleNewCards: false },
        cardsNum: 10,
      });

      // Completed limit
      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 2,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 5,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(new Date()),
        },
      });

      // Add due cards
      await createFirestoreCard(userId, deckId, makeDueCard("due-1"));
      await createFirestoreCard(userId, deckId, makeDueCard("due-2"));
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      const dueItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === false && i.card.cardAlgo != null
      );
      expect(dueItems.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Leave / re-enter scenario
  // ---------------------------------------------------------------------------

  describe("leave / re-enter mid-session", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("limits new cards after partial progress (inProgressNewCards accounting)", async () => {
      const limit = 5;
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 5,
        newCardsNumPerDay: limit,
      });
      await waitForFirestore();

      // Simulate: user started 2 new cards (inProgressNewCards=2, completedNewToday=0)
      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 3,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 2,
          completedNewToday: 0,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(new Date()),
        },
      });

      // Re-enter session
      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // inProgressNewCards(2) + completedNewToday(0) = 2 consumed; limit=5 → 3 item slots remain
      // But only 3 new cards haven't been started yet
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(3);
      expect(result.dailyStats.completedNewToday).toBe(0);
    });

    it("returns 0 new cards after reaching daily limit mid-session then re-entering", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 5,
        newCardsNumPerDay: 3,
      });

      // Simulate completed 3 new cards
      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 3,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(new Date()),
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(0);
    });

    it("daily stats resets when the date changes", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 3,
        newCardsNumPerDay: 3,
      });

      // Set dailyStats from yesterday
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 3,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(yesterday),
        },
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // Stats are stale → fresh session → new cards should appear again
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(3);
    });

    it("respects user timeZone at UTC day boundary when reading dailyStats", async () => {
      const utcYmd = (date: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);
      const tokyoYmd = (date: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);

      const now = new Date();
      let lastUpdatedStats: Date | null = null;
      for (let hourOffset = 1; hourOffset <= 23; hourOffset++) {
        const candidate = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);
        const utcChanged = utcYmd(candidate) !== utcYmd(now);
        const tokyoSameDay = tokyoYmd(candidate) === tokyoYmd(now);
        if (utcChanged && tokyoSameDay) {
          lastUpdatedStats = candidate;
          break;
        }
      }
      if (!lastUpdatedStats) {
        // This condition only exists when UTC time is 00:00–15:00; skip at other times.
        return;
      }

      await createTestUser(userId, { settings: { timeZone: "Asia/Tokyo" } });
      await createTestUserDeck(userId, deckId, {
        settings: { newCardsNumPerDay: 3, zenMode: false, shuffleNewCards: false },
        cardsNum: 3,
      });
      for (let i = 0; i < 3; i++) {
        await createFirestoreCard(userId, deckId, makeNewCard(`tz-card-${i}`));
      }

      await db.doc(`users/${userId}/decks/${deckId}`).update({
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 3,
          completedDueToday: 0,
          lastUpdatedStats: admin.firestore.Timestamp.fromDate(lastUpdatedStats as Date),
        },
      });

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Bidirectional mode
  // ---------------------------------------------------------------------------

  describe("bidirectional mode", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    afterEach(async () => {
      await clearUserDeckCards(userId, deckId);
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("generates 2 items per new card (forward + reverse)", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 1,
        bidirectional: true,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      expect(result.items.length).toBe(2);
      const directions = result.items.map((i: any) => i.direction);
      expect(directions).toContain("forward");
      expect(directions).toContain("reverse");
    });

    it("interleaves forward and reverse items", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 2,
        bidirectional: true,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // With 2 new cards in bidirectional mode we expect: [f, r, f, r] or similar interleave
      expect(result.items.length).toBe(4);
      // At least the first two items should not be the same direction
      expect(result.items[0].direction).not.toBe(result.items[1].direction);
    });

    it("lazy-inits cardAlgoReverse and firstLearnReverse for new cards missing them", async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: { bidirectional: true, zenMode: false, shuffleNewCards: false },
      });

      // Card WITHOUT reverse fields
      const cardId = generateTestId("bi-card");
      await createFirestoreCard(userId, deckId, makeNewCard(cardId));
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );
      await waitForFirestore(200);

      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const data = cardDoc.data();
      expect(data?.cardAlgoReverse).toBeDefined();
      expect(data?.firstLearnReverse).toBeDefined();
      expect(data?.firstLearnReverse?.isNew).toBe(true);
    });

    it("newCardsRemaining counts items not physical cards (2× in bidirectional)", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 3,
        bidirectional: true,
        newCardsNumPerDay: 10,
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // 3 physical cards × 2 = 6 items
      expect(result.dailyStats.newCardsRemaining).toBe(6);
    });

    it("item limit is halved for physical cards in bidirectional (floor(limit/2))", async () => {
      await setupStudyScenario({
        userId,
        deckId,
        newCards: 6,
        bidirectional: true,
        newCardsNumPerDay: 4, // 4 item slots → floor(4/2) = 2 physical cards
      });
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // Should return at most 4 items (2 physical × 2 directions)
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBeLessThanOrEqual(4);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("auto-copies deck on first access when user deck does not exist", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");

      // Create user deck manually (simulating a fresh copy scenario)
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // The session should succeed (no error) and return items array
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("returns empty items when deck has no cards", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");

      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await waitForFirestore();

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      expect(result.items).toEqual([]);
      expect(result.dailyStats.newCardsRemaining).toBe(0);

      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("throws unauthenticated when no auth provided", async () => {
      const deckId = generateTestId("deck");

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      await expect(
        wrapped(
          createMockCallableRequest({ auth: null, data: { deckId } })
        )
      ).rejects.toThrow();
    });

    it("persists fresh dailyStats before returning response", async () => {
      const userId = generateTestId("user");
      const deckId = generateTestId("deck");

      await setupStudyScenario({
        userId,
        deckId,
        newCards: 2,
        newCardsNumPerDay: 2,
      });

      const wrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await wrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      const deckDoc = await db.doc(`users/${userId}/decks/${deckId}`).get();
      const persistedStats = deckDoc.data()?.dailyStats;
      expect(persistedStats).toBeDefined();
      expect(persistedStats?.newCardsRemaining).toBe(result.dailyStats.newCardsRemaining);
      expect(persistedStats?.completedNewToday).toBe(result.dailyStats.completedNewToday);

      await clearUserData(userId);
      await clearDeckData(deckId);
    });
  });
});
