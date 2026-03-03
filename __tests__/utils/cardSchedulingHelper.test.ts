/**
 * Unit tests for utils/cardSchedulingHelper.ts
 *
 * Pure function tests — no Firebase, no emulator.
 * Uses jest.mock to stub learnScreen.constants (which imports from react-native).
 */

// Hoist mock: replace learnScreen.constants before any module loads it.
// Must use require() inside factory — jest.mock is hoisted before ES imports.
jest.mock("../../app/stack/learnScreen.constants", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { generatorParameters } = require("ts-fsrs");
  return {
    FSRS_PARAMS: generatorParameters({ enable_fuzz: false }),
    X_THRESHOLD: 0.16,
    Y_THRESHOLD: 0.12,
    DIMENSIONS: {
      CARD_MARGIN_TOP: -200,
      CARD_MARGIN_LEFT: -150,
      HEADER_MARGIN_BOTTOM: 30,
      PROGRESS_MARGIN_BOTTOM: 30,
    },
  };
});

import {
  evaluateCardAnswer,
  getItemDue,
  compDueDate,
} from "../../utils/cardSchedulingHelper";

import type { Card, CardAlgo, FirstLearn, DailyStats } from "@/types/schemas";
import { CardGrade } from "@/types/schemas/card";

// We define SessionItem inline so we don't import from learnScreen.types
// (which transitively imports react-native-reanimated)
interface SessionItem {
  card: Card;
  direction: "forward" | "reverse";
  seenInSession?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers to construct test data
// ---------------------------------------------------------------------------

function makeCardAlgo(overrides?: Partial<CardAlgo>): CardAlgo {
  return {
    difficulty: 2.5,
    scheduled_days: 1,
    due: new Date(),
    reps: 0,
    state: 0,
    stability: 0,
    elapsed_days: 0,
    lapses: 0,
    ...overrides,
  };
}

function makeFirstLearn(overrides?: Partial<FirstLearn>): FirstLearn {
  return { isNew: true, ...overrides };
}

function makeBaseCard(id = "card-1"): Card {
  return {
    id,
    cardData: { front: "Q", back: "A" },
    tags: [],
    createdAt: new Date(),
    firstLearn: makeFirstLearn(),
  };
}

function makeItem(
  card: Card,
  direction: "forward" | "reverse" = "forward",
  seenInSession?: boolean
): SessionItem {
  return { card, direction, seenInSession };
}

function makeStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    newCardsRemaining: 5,
    dueCardsRemaining: 3,
    inProgressDueCards: 0,
    inProgressNewCards: 0,
    completedNewToday: 0,
    completedDueToday: 0,
    lastUpdatedStats: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getItemDue
// ---------------------------------------------------------------------------

describe("getItemDue", () => {
  it("forward isNew: returns firstLearn.due when set", () => {
    const due = new Date(Date.now() + 60_000);
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true, due });
    const item = makeItem(card, "forward");
    expect(getItemDue(item)).toBeCloseTo(due.getTime(), -2);
  });

  it("forward isFirst: returns firstLearn.due", () => {
    const due = new Date(Date.now() + 60_000);
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: true, due });
    const item = makeItem(card, "forward");
    expect(getItemDue(item)).toBeCloseTo(due.getTime(), -2);
  });

  it("forward graduated: returns cardAlgo.due", () => {
    const due = new Date(Date.now() + 86400_000);
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due });
    const item = makeItem(card, "forward");
    expect(getItemDue(item)).toBeCloseTo(due.getTime(), -2);
  });

  it("reverse isNew: returns firstLearnReverse.due when set", () => {
    const due = new Date(Date.now() + 60_000);
    const card = makeBaseCard();
    card.firstLearnReverse = makeFirstLearn({ isNew: true, due });
    const item = makeItem(card, "reverse");
    expect(getItemDue(item)).toBeCloseTo(due.getTime(), -2);
  });

  it("reverse graduated: returns cardAlgoReverse.due", () => {
    const due = new Date(Date.now() + 86400_000);
    const card = makeBaseCard();
    card.firstLearnReverse = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgoReverse = makeCardAlgo({ due });
    const item = makeItem(card, "reverse");
    expect(getItemDue(item)).toBeCloseTo(due.getTime(), -2);
  });

  it("falls back to now when due not set", () => {
    const nowMs = Date.now();
    const card = makeBaseCard();
    const item = makeItem(card, "forward");
    expect(getItemDue(item, nowMs)).toBe(nowMs);
  });
});

// ---------------------------------------------------------------------------
// compDueDate
// ---------------------------------------------------------------------------

describe("compDueDate", () => {
  it("sorts items ascending by due date", () => {
    const earlier = new Date(Date.now() - 120_000);
    const later = new Date(Date.now() - 60_000);

    const cardA = makeBaseCard("a");
    cardA.firstLearn = makeFirstLearn({ isNew: true, due: later });
    const cardB = makeBaseCard("b");
    cardB.firstLearn = makeFirstLearn({ isNew: true, due: earlier });

    const a = makeItem(cardA, "forward");
    const b = makeItem(cardB, "forward");

    expect(compDueDate(a, b)).toBeGreaterThan(0); // b should come first
    expect(compDueDate(b, a)).toBeLessThan(0);
  });

  it("prioritizes seenInSession items when both are currently due", () => {
    const pastDue = new Date(Date.now() - 120_000);
    const cardA = makeBaseCard("a");
    cardA.firstLearn = makeFirstLearn({ isNew: false, isFirst: true, due: pastDue });
    const cardB = makeBaseCard("b");
    cardB.firstLearn = makeFirstLearn({ isNew: false, isFirst: true, due: pastDue });

    const seenItem = makeItem(cardA, "forward", true);
    const newItem = makeItem(cardB, "forward", false);

    // seenItem should be sorted before newItem (negative return means a < b)
    expect(compDueDate(seenItem, newItem)).toBeLessThan(0);
    expect(compDueDate(newItem, seenItem)).toBeGreaterThan(0);
  });

  it("returns 0 for equal due times and equal seenInSession", () => {
    const due = new Date(Date.now() - 60_000);
    const cardA = makeBaseCard("a");
    cardA.firstLearn = makeFirstLearn({ isNew: true, due });
    const cardB = makeBaseCard("b");
    cardB.firstLearn = makeFirstLearn({ isNew: true, due });

    const a = makeItem(cardA, "forward", false);
    const b = makeItem(cardB, "forward", false);

    expect(compDueDate(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateCardAnswer — Case 2 (first learning phase)
// ---------------------------------------------------------------------------

describe("evaluateCardAnswer — Case 2 (firstLearn phase)", () => {
  it("Good on new card: isNew→false, isFirst=true, inProgressNewCards+1, newCardsRemaining-1", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true });
    const item = makeItem(card);
    const stats = makeStats({ newCardsRemaining: 5, inProgressNewCards: 0 });

    const result = evaluateCardAnswer(item as any, CardGrade.Good, stats);

    expect(result.updatedItem.card.firstLearn?.isNew).toBe(false);
    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(true);
    expect(result.updatedItem.card.firstLearn?.consecutiveGood).toBe(1);
    expect(result.newStats?.newCardsRemaining).toBe(4);
    expect(result.newStats?.inProgressNewCards).toBe(1);
    // Card should stay in queue (first learn → requeue)
    expect(result.sessionItem).not.toBeNull();
    expect(result.scheduledTimeDelta).toBe(10 * 60 * 1000); // FIRST_LEARN_DELAY_GOOD_MS
  });

  it("Good increments consecutiveGood", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: true, consecutiveGood: 0 });
    const item = makeItem(card);

    const result = evaluateCardAnswer(item as any, CardGrade.Good, null);

    expect(result.updatedItem.card.firstLearn?.consecutiveGood).toBe(1);
  });

  it("Hard on new card: isFirst=true, consecutiveGood=0, scheduledTime=5min", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true });
    const item = makeItem(card);
    const stats = makeStats();

    const result = evaluateCardAnswer(item as any, CardGrade.Hard, stats);

    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(true);
    expect(result.updatedItem.card.firstLearn?.consecutiveGood).toBe(0);
    expect(result.scheduledTimeDelta).toBe(5 * 60 * 1000); // FIRST_LEARN_DELAY_HARD_MS
    expect(result.sessionItem).not.toBeNull();
  });

  it("Wrong resets consecutiveGood to 0 and schedules 2min delay", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: true, consecutiveGood: 1 });
    const item = makeItem(card);

    const result = evaluateCardAnswer(item as any, CardGrade.Wrong, null);

    expect(result.updatedItem.card.firstLearn?.consecutiveGood).toBe(0);
    expect(result.scheduledTimeDelta).toBe(2 * 60 * 1000); // FIRST_LEARN_DELAY_WRONG_MS
    expect(result.sessionItem).not.toBeNull();
  });

  it("reverse direction: updates firstLearnReverse, not firstLearn", () => {
    const card = makeBaseCard();
    card.firstLearnReverse = makeFirstLearn({ isNew: true });
    const item = makeItem(card, "reverse");

    const result = evaluateCardAnswer(item as any, CardGrade.Good, null);

    expect(result.updatedItem.card.firstLearnReverse?.isFirst).toBe(true);
    expect(result.updatedItem.card.firstLearnReverse?.consecutiveGood).toBe(1);
    // Forward firstLearn should be unchanged
    expect(result.updatedItem.card.firstLearn?.isNew).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateCardAnswer — Case 1 (FSRS graduation)
// ---------------------------------------------------------------------------

describe("evaluateCardAnswer — Case 1 (FSRS graduation)", () => {
  it("Easy on new card: graduates immediately, sessionItem=null", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true });
    const item = makeItem(card);
    const stats = makeStats({ newCardsRemaining: 5 });

    const result = evaluateCardAnswer(item as any, CardGrade.Easy, stats);

    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(false);
    expect(result.updatedItem.card.firstLearn?.isNew).toBe(false);
    expect(result.sessionItem).toBeNull(); // leaves queue
    expect(result.newStats?.completedNewToday).toBe(1);
    expect(result.newStats?.newCardsRemaining).toBe(4);
  });

  it("Good with consecutiveGood=1: FSRS graduation, sessionItem=null", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({
      isNew: false,
      isFirst: true,
      consecutiveGood: 1,
    });
    const item = makeItem(card);
    const stats = makeStats({ inProgressNewCards: 1 });

    const result = evaluateCardAnswer(item as any, CardGrade.Good, stats);

    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(false);
    expect(result.sessionItem).toBeNull();
    expect(result.newStats?.completedNewToday).toBe(1);
    expect(result.newStats?.inProgressNewCards).toBe(0);
  });

  it("Wrong on graduated card: requeued with 10min session delay", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    const item = makeItem(card, "forward", false);

    const result = evaluateCardAnswer(item as any, CardGrade.Wrong, null);

    expect(result.sessionItem).not.toBeNull();
    // Session due should be ~10 minutes from now
    const sessionDue = result.sessionItem!.card.cardAlgo?.due?.getTime() ?? 0;
    const expectedDue = Date.now() + 10 * 60 * 1000;
    expect(sessionDue).toBeGreaterThan(Date.now());
    expect(sessionDue).toBeLessThanOrEqual(expectedDue + 2000);
  });

  it("Easy on graduated card: leaves queue (sessionItem=null), completedDueToday+1", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    // seenInSession=false → not in progress
    const item = makeItem(card, "forward", false);
    const stats = makeStats({ dueCardsRemaining: 3 });

    const result = evaluateCardAnswer(item as any, CardGrade.Easy, stats);

    expect(result.sessionItem).toBeNull();
    expect(result.newStats?.completedDueToday).toBe(1);
    expect(result.newStats?.dueCardsRemaining).toBe(2);
  });

  it("reverse direction: updates cardAlgoReverse, not cardAlgo", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    card.firstLearnReverse = makeFirstLearn({
      isNew: false,
      isFirst: true,
      consecutiveGood: 1,
    });
    card.cardAlgoReverse = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    const item = makeItem(card, "reverse");

    const result = evaluateCardAnswer(item as any, CardGrade.Easy, null);

    expect(result.updatedItem.card.firstLearnReverse?.isFirst).toBe(false);
    expect(result.updatedItem.card.cardAlgoReverse).toBeDefined();
    // Forward algo should be unchanged
    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(false);
  });

  it("Hard on graduated card: stays in Case 1, sessionItem=null", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    const item = makeItem(card, "forward", false);
    const stats = makeStats({ dueCardsRemaining: 2 });

    const result = evaluateCardAnswer(item as any, CardGrade.Hard, stats);

    // Hard on a graduated card still runs FSRS (Case 1)
    expect(result.updatedItem.card.firstLearn?.isFirst).toBe(false);
    expect(result.sessionItem).toBeNull();
  });

  it("cardAlgo.due is in the future after graduation", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true });
    const item = makeItem(card);

    const result = evaluateCardAnswer(item as any, CardGrade.Easy, null);

    const due = result.updatedItem.card.cardAlgo?.due;
    expect(due).toBeDefined();
    expect(due!.getTime()).toBeGreaterThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// evaluateCardAnswer — stats immutability
// ---------------------------------------------------------------------------

describe("evaluateCardAnswer — stats immutability", () => {
  it("does not mutate the original stats object", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: true });
    const item = makeItem(card);
    const stats = makeStats({ newCardsRemaining: 5 });
    const originalRemaining = stats.newCardsRemaining;

    evaluateCardAnswer(item as any, CardGrade.Good, stats);

    expect(stats.newCardsRemaining).toBe(originalRemaining);
  });
});

// ---------------------------------------------------------------------------
// evaluateCardAnswer — matrix coverage (grade x phase x seenInSession)
// ---------------------------------------------------------------------------

describe("evaluateCardAnswer — matrix coverage", () => {
  const grades = [
    CardGrade.Wrong,
    CardGrade.Hard,
    CardGrade.Good,
    CardGrade.Easy,
  ] as const;

  const phases = [
    {
      label: "new",
      cardFactory: () => {
        const card = makeBaseCard();
        card.firstLearn = makeFirstLearn({ isNew: true });
        return card;
      },
    },
    {
      label: "firstLearn",
      cardFactory: () => {
        const card = makeBaseCard();
        card.firstLearn = makeFirstLearn({
          isNew: false,
          isFirst: true,
          consecutiveGood: 0,
        });
        return card;
      },
    },
    {
      label: "graduated",
      cardFactory: () => {
        const card = makeBaseCard();
        card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
        card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
        return card;
      },
    },
  ] as const;

  describe.each(phases)("$label", ({ cardFactory }) => {
    describe.each(grades)("grade=%s", (grade) => {
      it.each([false, true])("seenInSession=%s keeps stats >= 0", (seen) => {
        const card = cardFactory();
        const item = makeItem(card, "forward", seen);
        const stats = makeStats({
          newCardsRemaining: 2,
          dueCardsRemaining: 2,
          inProgressDueCards: 1,
          inProgressNewCards: 1,
        });

        const result = evaluateCardAnswer(item as any, grade, stats);
        if (result.newStats) {
          expect(result.newStats.newCardsRemaining).toBeGreaterThanOrEqual(0);
          expect(result.newStats.dueCardsRemaining).toBeGreaterThanOrEqual(0);
          expect(result.newStats.inProgressDueCards).toBeGreaterThanOrEqual(0);
          expect(result.newStats.inProgressNewCards).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  it("forward and reverse keep independent firstLearn fields in matrix run", () => {
    const card = makeBaseCard();
    card.firstLearn = makeFirstLearn({ isNew: false, isFirst: false });
    card.cardAlgo = makeCardAlgo({ due: new Date(Date.now() - 60_000) });
    card.firstLearnReverse = makeFirstLearn({ isNew: true });

    const forwardResult = evaluateCardAnswer(
      makeItem(card, "forward") as any,
      CardGrade.Easy,
      null
    );
    expect(forwardResult.updatedItem.card.firstLearn?.isNew).toBe(false);
    expect(forwardResult.updatedItem.card.firstLearnReverse?.isNew).toBe(true);

    const reverseResult = evaluateCardAnswer(
      makeItem(card, "reverse") as any,
      CardGrade.Good,
      null
    );
    expect(reverseResult.updatedItem.card.firstLearnReverse?.isFirst).toBe(true);
    expect(reverseResult.updatedItem.card.firstLearn?.isFirst).toBe(false);
  });
});
