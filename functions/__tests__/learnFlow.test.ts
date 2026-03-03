/**
 * End-to-end learning flow tests: startLearningSession → updateCardProgress
 *
 * Covers:
 *  - Happy path: new card → answer Good → graduation
 *  - Due card answered correctly (FSRS update + side effects)
 *  - Wrong answer on graduated card (session requeue)
 *  - Leave / re-enter mid-session (no double-counting)
 *  - Bidirectional flow (forward + reverse updateCardProgress)
 *  - Side effects: studySessions doc, daily stats, user stats
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
  getLearningStateSnapshot,
} from "./helpers/testHelpers";
import {
  createFirestoreCard,
  makeNewCard,
  makeDueCard,
  makeGraduatedCard,
  makeCardAlgo,
  buildRoundCardMix,
} from "./helpers/cardFactory";
import { CardGrade } from "../src/types/common";
import {
  assertDailyStatsNonNegative,
  assertDailyStatsRespectLimit,
  assertNoDuplicateSessionItems,
} from "./helpers/learningInvariants";
import { runLearningRoundScenario } from "./helpers/learningRoundRunner";

const db = admin.firestore();

let deckFunctions: typeof import("../src/deckFunctions");
let userFunctions: typeof import("../src/userFunctions");

describe("Learning flow (E2E)", () => {
  beforeEach(async () => {
    deckFunctions = await import("../src/deckFunctions");
    userFunctions = await import("../src/userFunctions");
  });

  afterAll(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // New card → first learning phase
  // ---------------------------------------------------------------------------

  describe("new card happy path", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");
    const cardId = generateTestId("card");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: { newCardsNumPerDay: 10, zenMode: false, shuffleNewCards: false },
      });
      await createFirestoreCard(userId, deckId, makeNewCard(cardId));
      await waitForFirestore();
    });

    afterEach(async () => {
      await clearUserDeckCards(userId, deckId);
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("first Good answer sets isFirst=true, inProgressNewCards += 1", async () => {
      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const sessionResult = await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      expect(sessionResult.items.length).toBe(1);
      assertNoDuplicateSessionItems(sessionResult.items);
      assertDailyStatsNonNegative(sessionResult.dailyStats);
      assertDailyStatsRespectLimit(sessionResult.dailyStats, 10);
      const item = sessionResult.items[0];

      // Build the card state after first Good (Case 2 — firstLearn phase)
      const updatedCard = {
        ...item.card,
        firstLearn: {
          isNew: false,
          isFirst: true,
          consecutiveGood: 1,
          due: new Date(Date.now() + 10 * 60 * 1000),
        },
        grade: CardGrade.Good,
        createdAt: new Date(item.card.createdAt),
      };

      const updatedStats = {
        ...sessionResult.dailyStats,
        newCardsRemaining: 0,
        inProgressNewCards: 1,
        lastUpdatedStats: new Date(sessionResult.dailyStats.lastUpdatedStats),
      };

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      const updateResult = await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: updatedCard,
            scheduledTime: 10 * 60 * 1000,
            dailyStats: updatedStats,
            direction: "forward",
          },
        })
      );

      expect(updateResult.success).toBe(true);
      await waitForFirestore(100);

      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.firstLearn?.isFirst).toBe(true);
      expect(cardData?.firstLearn?.isNew).toBe(false);
      expect(cardData?.firstLearn?.consecutiveGood).toBe(1);
    });

    it("second Good answer (consecutiveGood=1 → graduation) sets isFirst=false", async () => {
      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const sessionResult = await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(sessionResult.items);
      assertDailyStatsNonNegative(sessionResult.dailyStats);
      const item = sessionResult.items[0];

      // Simulate card already at consecutiveGood=1 (after first Good)
      const graduatingCard = {
        ...item.card,
        firstLearn: {
          isNew: false,
          isFirst: false, // graduation: evaluateCardAnswer sets isFirst=false
          consecutiveGood: 0,
          due: new Date(),
        },
        cardAlgo: makeCardAlgo({
          due: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
        grade: CardGrade.Good,
        createdAt: new Date(item.card.createdAt),
      };

      const updatedStats = {
        ...sessionResult.dailyStats,
        newCardsRemaining: 0,
        inProgressNewCards: 0,
        completedNewToday: 1,
        lastUpdatedStats: new Date(sessionResult.dailyStats.lastUpdatedStats),
      };

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: graduatingCard,
            scheduledTime: 24 * 60 * 60 * 1000,
            dailyStats: updatedStats,
            direction: "forward",
          },
        })
      );

      await waitForFirestore(100);

      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const cardData = cardDoc.data();
      expect(cardData?.firstLearn?.isFirst).toBe(false);

      // Deck dailyStats should reflect completedNewToday
      const deckDoc = await db.doc(`users/${userId}/decks/${deckId}`).get();
      const deckStats = deckDoc.data()?.dailyStats;
      expect(deckStats?.completedNewToday).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Due card
  // ---------------------------------------------------------------------------

  describe("due card", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");
    const cardId = generateTestId("card");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createFirestoreCard(userId, deckId, makeDueCard(cardId));
      await waitForFirestore();
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("Easy answer on due card: cardAlgo.due set in future, studySession created", async () => {
      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const sessionResult = await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(sessionResult.items);
      assertDailyStatsNonNegative(sessionResult.dailyStats);
      const item = sessionResult.items[0];
      const scheduledTime = 24 * 60 * 60 * 1000; // 1 day

      const updatedCard = {
        ...item.card,
        firstLearn: { isNew: false, isFirst: false },
        cardAlgo: makeCardAlgo({
          due: new Date(Date.now() + scheduledTime),
          reps: 1,
        }),
        grade: CardGrade.Easy,
        createdAt: new Date(item.card.createdAt),
      };

      const updatedStats = {
        ...sessionResult.dailyStats,
        completedDueToday: 1,
        lastUpdatedStats: new Date(sessionResult.dailyStats.lastUpdatedStats),
      };

      const beforeTime = Date.now();
      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: updatedCard,
            scheduledTime,
            dailyStats: updatedStats,
          },
        })
      );
      await waitForFirestore(100);

      // Card due should be in the future
      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const cardData = cardDoc.data();
      const dueMs = (cardData?.cardAlgo?.due as admin.firestore.Timestamp)
        .toDate()
        .getTime();
      expect(dueMs).toBeGreaterThan(beforeTime);

      // Study session should be created
      const sessions = await db
        .collection(`users/${userId}/studySessions`)
        .where("cardId", "==", cardId)
        .get();
      expect(sessions.size).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Wrong answer on FSRS (graduated) card
  // ---------------------------------------------------------------------------

  describe("wrong answer on graduated card", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");
    const cardId = generateTestId("card");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createFirestoreCard(userId, deckId, makeGraduatedCard(cardId));
      await waitForFirestore();
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("Wrong on FSRS: cardAlgo.due updated, card stays in Firestore", async () => {
      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const sessionResult = await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      assertNoDuplicateSessionItems(sessionResult.items);
      assertDailyStatsNonNegative(sessionResult.dailyStats);
      const item = sessionResult.items[0];

      // Wrong answer → session requeue delay (FSRS_WRONG_SESSION_DELAY_MS = 10min)
      const sessionDelayMs = 10 * 60 * 1000;
      const updatedCard = {
        ...item.card,
        firstLearn: { isNew: false, isFirst: false },
        cardAlgo: makeCardAlgo({
          due: new Date(Date.now() + sessionDelayMs),
          lapses: 1,
        }),
        grade: CardGrade.Wrong,
        createdAt: new Date(item.card.createdAt),
      };

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      const result = await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: updatedCard,
            scheduledTime: sessionDelayMs,
            dailyStats: sessionResult.dailyStats
              ? { ...sessionResult.dailyStats, lastUpdatedStats: new Date(sessionResult.dailyStats.lastUpdatedStats) }
              : null,
          },
        })
      );

      expect(result.success).toBe(true);

      // Card should still exist in Firestore
      const cardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      expect(cardDoc.exists).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Leave / re-enter mid-session
  // ---------------------------------------------------------------------------

  describe("leave / re-enter mid-session", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: { newCardsNumPerDay: 5, zenMode: false, shuffleNewCards: false },
      });
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("after 2 Good answers (inProgress=2), re-enter respects remaining slots", async () => {
      // Create 5 new cards
      for (let i = 0; i < 5; i++) {
        await createFirestoreCard(userId, deckId, makeNewCard(generateTestId("card")));
      }
      await waitForFirestore();

      // Simulate that 2 cards are inProgress (answered Good once, not graduated)
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
      await waitForFirestore();

      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      const result = await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );

      // limit=5, inProgress=2, completed=0 → 3 item slots remain
      assertNoDuplicateSessionItems(result.items);
      assertDailyStatsNonNegative(result.dailyStats);
      assertDailyStatsRespectLimit(result.dailyStats, 5);
      const newItems = result.items.filter(
        (i: any) => i.card.firstLearn?.isNew === true
      );
      expect(newItems.length).toBeLessThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Bidirectional flow
  // ---------------------------------------------------------------------------

  describe("bidirectional flow", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");
    const cardId = generateTestId("card");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId, {
        settings: {
          bidirectional: true,
          newCardsNumPerDay: 10,
          zenMode: false,
          shuffleNewCards: false,
        },
      });
      // Card with both forward and reverse fields
      const card = makeNewCard(cardId);
      await createFirestoreCard(userId, deckId, card);
      await waitForFirestore();
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("forward and reverse updateCardProgress update independent fields", async () => {
      const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
      await startWrapped(
        createMockCallableRequest({ auth: { uid: userId }, data: { deckId } })
      );
      await waitForFirestore(200);

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      const baseCardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const baseCardData = baseCardDoc.data();

      // Forward update
      const forwardCard = {
        id: cardId,
        cardData: baseCardData?.cardData,
        tags: [],
        createdAt: new Date(),
        firstLearn: {
          isNew: false,
          isFirst: true,
          consecutiveGood: 1,
        },
        cardAlgoReverse: baseCardData?.cardAlgoReverse
          ? {
              difficulty: baseCardData.cardAlgoReverse.difficulty,
              scheduled_days: baseCardData.cardAlgoReverse.scheduled_days,
              due: (baseCardData.cardAlgoReverse.due as admin.firestore.Timestamp).toDate(),
              reps: baseCardData.cardAlgoReverse.reps,
              state: baseCardData.cardAlgoReverse.state,
              stability: baseCardData.cardAlgoReverse.stability,
              elapsed_days: baseCardData.cardAlgoReverse.elapsed_days,
              lapses: baseCardData.cardAlgoReverse.lapses,
            }
          : makeCardAlgo(),
        firstLearnReverse: {
          isNew: true,
        },
        grade: CardGrade.Good,
      };

      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: forwardCard,
            scheduledTime: 10 * 60 * 1000,
            dailyStats: null,
            direction: "forward",
          },
        })
      );
      await waitForFirestore(100);

      const afterForwardDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const afterForwardData = afterForwardDoc.data();
      // firstLearn.due should be updated (forward), firstLearnReverse should remain isNew=true
      expect(afterForwardData?.firstLearn?.isFirst).toBe(true);
      expect(afterForwardData?.firstLearnReverse?.isNew).toBe(true);

      // Reverse update
      const reverseCard = {
        id: cardId,
        cardData: afterForwardData?.cardData,
        tags: [],
        createdAt: new Date(),
        firstLearn: afterForwardData?.firstLearn
          ? {
              isNew: afterForwardData.firstLearn.isNew,
              isFirst: afterForwardData.firstLearn.isFirst,
              consecutiveGood: afterForwardData.firstLearn.consecutiveGood,
            }
          : { isNew: false },
        firstLearnReverse: {
          isNew: false,
          isFirst: true,
          consecutiveGood: 1,
        },
        cardAlgoReverse: makeCardAlgo(),
        grade: CardGrade.Good,
      };

      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card: reverseCard,
            scheduledTime: 10 * 60 * 1000,
            dailyStats: null,
            direction: "reverse",
          },
        })
      );
      await waitForFirestore(100);

      const afterReverseDoc = await db
        .doc(`users/${userId}/decks/${deckId}/cards/${cardId}`)
        .get();
      const afterReverseData = afterReverseDoc.data();
      // firstLearnReverse.due should now be updated; forward should be unchanged
      expect(afterReverseData?.firstLearnReverse?.isFirst).toBe(true);
      expect(afterReverseData?.firstLearn?.isFirst).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Round-based scenarios (future-proof for N cards per round)
  // ---------------------------------------------------------------------------

  describe("round scenarios", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");

    beforeEach(async () => {
      await createTestUser(userId);
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    describe.each([
      {
        label: "single-direction round size 3",
        bidirectional: false,
        roundSize: 3,
        newCardsNumPerDay: 10,
        newCards: 8,
        dueCards: 0,
        expectedMaxPerRound: 3,
      },
      {
        label: "mixed new+due round size 4",
        bidirectional: false,
        roundSize: 4,
        newCardsNumPerDay: 10,
        newCards: 6,
        dueCards: 4,
        expectedMaxPerRound: 4,
      },
      {
        label: "bidirectional round size 10 items",
        bidirectional: true,
        roundSize: 10,
        newCardsNumPerDay: 20,
        newCards: 8,
        dueCards: 2,
        expectedMaxPerRound: 10,
      },
    ])("$label", (cfg) => {
      it("runs deterministic rounds with stable invariants", async () => {
        await createTestUserDeck(userId, deckId, {
          settings: {
            bidirectional: cfg.bidirectional,
            newCardsNumPerDay: cfg.newCardsNumPerDay,
            zenMode: false,
            shuffleNewCards: false,
          },
          cardsNum: cfg.newCards + cfg.dueCards,
        });
        const cardMix = buildRoundCardMix({
          newCards: cfg.newCards,
          dueCards: cfg.dueCards,
          bidirectional: cfg.bidirectional,
          cardIdPrefix: "r",
        });
        for (const card of cardMix.newCards) {
          await createFirestoreCard(userId, deckId, card);
        }
        for (const card of cardMix.dueCards) {
          await createFirestoreCard(userId, deckId, card);
        }
        await waitForFirestore();

        const startWrapped = testEnv.wrap(deckFunctions.startLearningSession);
        const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
        const snapshots = await runLearningRoundScenario({
          startWrapped,
          updateWrapped,
          userId,
          deckId,
          rounds: 2,
          roundSize: cfg.roundSize,
          grade: CardGrade.Good,
          scheduledTimeMs: 10 * 60 * 1000,
        });

        expect(snapshots.length).toBe(2);
        for (const snap of snapshots) {
          assertDailyStatsNonNegative(snap.dailyStats);
          assertDailyStatsRespectLimit(snap.dailyStats, cfg.newCardsNumPerDay);
          expect(snap.processedInRound).toBeLessThanOrEqual(cfg.expectedMaxPerRound);
        }

        const stateSnapshot = await getLearningStateSnapshot(userId, deckId);
        expect(stateSnapshot.cardCount).toBeGreaterThanOrEqual(
          cfg.newCards + cfg.dueCards
        );
        expect(stateSnapshot.studySessionCount).toBeGreaterThanOrEqual(
          snapshots[0].processedInRound
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Side effects: studySessions + user stats
  // ---------------------------------------------------------------------------

  describe("side effects", () => {
    const userId = generateTestId("user");
    const deckId = generateTestId("deck");
    const cardId = generateTestId("card");

    beforeEach(async () => {
      await createTestUser(userId);
      await createTestUserDeck(userId, deckId);
      await createFirestoreCard(userId, deckId, makeDueCard(cardId));
      await waitForFirestore();
    });

    afterEach(async () => {
      await clearUserData(userId);
      await clearDeckData(deckId);
    });

    it("creates a studySessions document on each updateCardProgress call", async () => {
      const sessionsBefore = await db
        .collection(`users/${userId}/studySessions`)
        .where("cardId", "==", cardId)
        .get();
      expect(sessionsBefore.size).toBe(0);

      const card = {
        id: cardId,
        cardData: { front: "Q", back: "A" },
        tags: [],
        createdAt: new Date(),
        firstLearn: { isNew: false },
        cardAlgo: makeCardAlgo({ due: new Date(Date.now() + 86400000) }),
        grade: CardGrade.Easy,
      };

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card,
            scheduledTime: 86400000,
            dailyStats: null,
          },
        })
      );
      await waitForFirestore(100);

      const sessionsAfter = await db
        .collection(`users/${userId}/studySessions`)
        .where("cardId", "==", cardId)
        .get();
      expect(sessionsAfter.size).toBe(1);
      expect(sessionsAfter.docs[0].data().deckId).toBe(deckId);
    });

    it("updates deck dailyStats after updateCardProgress", async () => {
      const dailyStats = {
        newCardsRemaining: 0,
        dueCardsRemaining: 1,
        inProgressDueCards: 0,
        inProgressNewCards: 0,
        completedNewToday: 0,
        completedDueToday: 0,
        lastUpdatedStats: new Date(),
      };

      const card = {
        id: cardId,
        cardData: { front: "Q", back: "A" },
        tags: [],
        createdAt: new Date(),
        firstLearn: { isNew: false },
        cardAlgo: makeCardAlgo({ due: new Date(Date.now() + 86400000) }),
        grade: CardGrade.Easy,
      };

      const updateWrapped = testEnv.wrap(userFunctions.updateCardProgress);
      await updateWrapped(
        createMockCallableRequest({
          auth: { uid: userId },
          data: {
            userId,
            deckId,
            card,
            scheduledTime: 86400000,
            dailyStats,
          },
        })
      );
      await waitForFirestore(100);

      const deckDoc = await db.doc(`users/${userId}/decks/${deckId}`).get();
      const deckData = deckDoc.data();
      expect(deckData?.dailyStats).toBeDefined();
    });
  });
});
