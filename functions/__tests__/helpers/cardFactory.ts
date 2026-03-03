/**
 * Card factory helpers for extensible test data creation.
 *
 * Centralizes all Card/CardAlgo/FirstLearn shape so that when the schema changes,
 * only this file needs updating — all tests referencing these factories fix automatically.
 */

import * as admin from "firebase-admin";
import {
  Card,
  CardAlgo,
  FirstLearn,
  DeckSettings,
} from "../../src/types/common";
import {
  createTestUser,
  createTestUserDeck,
  generateTestId,
} from "./testHelpers";

// ---------------------------------------------------------------------------
// Low-level field factories
// ---------------------------------------------------------------------------

/** Default FSRS CardAlgo (mirrors DEFAULT_CARD_ALGO from constants). */
export function makeCardAlgo(overrides?: Partial<CardAlgo>): CardAlgo {
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

/** Default FirstLearn shape for a brand-new card. */
export function makeFirstLearn(overrides?: Partial<FirstLearn>): FirstLearn {
  return {
    isNew: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Card presets
// ---------------------------------------------------------------------------

function baseCard(id: string): Card {
  return {
    id,
    cardData: { front: `Front ${id}`, back: `Back ${id}` },
    tags: [],
    createdAt: new Date(),
    firstLearn: makeFirstLearn(),
  };
}

/**
 * A card that has never been seen (firstLearn.isNew = true).
 */
export function makeNewCard(id: string, overrides?: Partial<Card>): Card {
  return {
    ...baseCard(id),
    firstLearn: makeFirstLearn({ isNew: true }),
    ...overrides,
  };
}

/**
 * A card that is due for FSRS review (cardAlgo.due is in the past).
 * @param daysOverdue - How many days in the past the due date should be (default 1).
 */
export function makeDueCard(id: string, daysOverdue = 1): Card {
  const dueDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);
  return {
    ...baseCard(id),
    firstLearn: makeFirstLearn({ isNew: false }),
    cardAlgo: makeCardAlgo({ due: dueDate }),
  };
}

/**
 * A card in the first-learning phase (isFirst=true, isNew=false).
 * @param consecutiveGood - Consecutive good answers so far (default 0).
 */
export function makeFirstLearnCard(
  id: string,
  consecutiveGood = 0
): Card {
  return {
    ...baseCard(id),
    firstLearn: makeFirstLearn({
      isNew: false,
      isFirst: true,
      consecutiveGood,
      due: new Date(Date.now() - 60_000), // due 1 minute ago
    }),
  };
}

/**
 * A card that has graduated from first-learning (isFirst=false, isNew=false).
 * Uses FSRS scheduling.
 */
export function makeGraduatedCard(id: string): Card {
  return {
    ...baseCard(id),
    firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
    cardAlgo: makeCardAlgo({ due: new Date(Date.now() - 60_000) }),
  };
}

/**
 * A card with both forward and reverse fields initialised (bidirectional).
 */
export function makeBidirectionalCard(id: string): Card {
  return {
    ...baseCard(id),
    firstLearn: makeFirstLearn({ isNew: true }),
    cardAlgoReverse: makeCardAlgo(),
    firstLearnReverse: makeFirstLearn({ isNew: true }),
  };
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

/**
 * Writes a single card to users/{userId}/decks/{deckId}/cards/{card.id}.
 * Converts Date fields to Firestore Timestamps.
 */
export async function createFirestoreCard(
  userId: string,
  deckId: string,
  card: Card
): Promise<void> {
  const cardAlgoData = card.cardAlgo
    ? {
      difficulty: card.cardAlgo.difficulty,
      scheduled_days: card.cardAlgo.scheduled_days,
      due: admin.firestore.Timestamp.fromDate(card.cardAlgo.due),
      reps: card.cardAlgo.reps,
      state: card.cardAlgo.state,
      stability: card.cardAlgo.stability,
      elapsed_days: card.cardAlgo.elapsed_days,
      lapses: card.cardAlgo.lapses,
      ...(card.cardAlgo.last_review && {
        last_review: admin.firestore.Timestamp.fromDate(
          card.cardAlgo.last_review
        ),
      }),
    }
    : undefined;

  const cardAlgoReverseData = card.cardAlgoReverse
    ? {
      difficulty: card.cardAlgoReverse.difficulty,
      scheduled_days: card.cardAlgoReverse.scheduled_days,
      due: admin.firestore.Timestamp.fromDate(card.cardAlgoReverse.due),
      reps: card.cardAlgoReverse.reps,
      state: card.cardAlgoReverse.state,
      stability: card.cardAlgoReverse.stability,
      elapsed_days: card.cardAlgoReverse.elapsed_days,
      lapses: card.cardAlgoReverse.lapses,
    }
    : undefined;

  const firstLearnData: Record<string, unknown> = {
    isNew: card.firstLearn.isNew,
  };
  if (card.firstLearn.isFirst !== undefined)
    firstLearnData.isFirst = card.firstLearn.isFirst;
  if (card.firstLearn.due !== undefined)
    firstLearnData.due = admin.firestore.Timestamp.fromDate(
      new Date(card.firstLearn.due)
    );
  if (card.firstLearn.consecutiveGood !== undefined)
    firstLearnData.consecutiveGood = card.firstLearn.consecutiveGood;

  const firstLearnReverseData: Record<string, unknown> | undefined =
    card.firstLearnReverse
      ? { isNew: card.firstLearnReverse.isNew }
      : undefined;
  if (firstLearnReverseData && card.firstLearnReverse?.isFirst !== undefined) {
    firstLearnReverseData.isFirst = card.firstLearnReverse.isFirst;
  }
  if (firstLearnReverseData && card.firstLearnReverse?.due !== undefined) {
    firstLearnReverseData.due = admin.firestore.Timestamp.fromDate(
      new Date(card.firstLearnReverse.due)
    );
  }
  if (
    firstLearnReverseData &&
    card.firstLearnReverse?.consecutiveGood !== undefined
  ) {
    firstLearnReverseData.consecutiveGood =
      card.firstLearnReverse.consecutiveGood;
  }

  const db = admin.firestore();
  const docData: Record<string, unknown> = {
    id: card.id,
    cardData: card.cardData,
    tags: card.tags,
    createdAt: admin.firestore.Timestamp.fromDate(new Date(card.createdAt)),
    firstLearn: firstLearnData,
  };

  if (cardAlgoData) docData.cardAlgo = cardAlgoData;
  if (cardAlgoReverseData) docData.cardAlgoReverse = cardAlgoReverseData;
  if (firstLearnReverseData) docData.firstLearnReverse = firstLearnReverseData;
  if (card.grade !== undefined) docData.grade = card.grade;

  await db
    .doc(`users/${userId}/decks/${deckId}/cards/${card.id}`)
    .set(docData);
}

// ---------------------------------------------------------------------------
// Scenario helpers
// ---------------------------------------------------------------------------

export interface StudyScenarioConfig {
  userId: string;
  deckId: string;
  newCards?: number;
  dueCards?: number;
  firstLearnCards?: number;
  newCardsNumPerDay?: number;
  bidirectional?: boolean;
  /** Prefix for generated card IDs (default "card") */
  cardIdPrefix?: string;
}

export interface RoundCardMixConfig {
  newCards: number;
  dueCards: number;
  bidirectional?: boolean;
  cardIdPrefix?: string;
}

export interface RoundCardMixResult {
  newCards: Card[];
  dueCards: Card[];
}

/**
 * Sets up a complete study scenario:
 *  - Creates user + user deck
 *  - Creates N new cards, M due cards, K firstLearn cards
 *  - Respects bidirectional flag and newCardsNumPerDay setting
 *
 * Returns generated card IDs for use in assertions.
 */
export async function setupStudyScenario(
  config: StudyScenarioConfig
): Promise<{
  newCardIds: string[];
  dueCardIds: string[];
  firstLearnCardIds: string[];
}> {
  const {
    userId,
    deckId,
    newCards = 0,
    dueCards = 0,
    firstLearnCards = 0,
    newCardsNumPerDay,
    bidirectional = false,
    cardIdPrefix = "card",
  } = config;

  const deckSettings: Partial<DeckSettings> & {
    zenMode: boolean;
    shuffleNewCards: boolean;
    bidirectional: boolean;
  } = {
    zenMode: false,
    shuffleNewCards: false,
    bidirectional,
  };
  if (newCardsNumPerDay !== undefined) {
    deckSettings.newCardsNumPerDay = newCardsNumPerDay;
  }

  await createTestUser(userId);
  await createTestUserDeck(userId, deckId, {
    settings: deckSettings,
    cardsNum: newCards + dueCards + firstLearnCards,
  });

  const newCardIds: string[] = [];
  for (let i = 0; i < newCards; i++) {
    const cardId = generateTestId(`${cardIdPrefix}-new`);
    const card = makeNewCard(cardId);
    if (bidirectional) {
      // Add reverse fields
      (card as Card & { cardAlgoReverse?: CardAlgo }).cardAlgoReverse =
        makeCardAlgo();
      (
        card as Card & { firstLearnReverse?: FirstLearn }
      ).firstLearnReverse = makeFirstLearn({ isNew: true });
    }
    await createFirestoreCard(userId, deckId, card);
    newCardIds.push(cardId);
  }

  const dueCardIds: string[] = [];
  for (let i = 0; i < dueCards; i++) {
    const cardId = generateTestId(`${cardIdPrefix}-due`);
    const card = makeDueCard(cardId);
    if (bidirectional) {
      (card as Card & { cardAlgoReverse?: CardAlgo }).cardAlgoReverse =
        makeCardAlgo({ due: new Date(Date.now() - 60_000) });
      (
        card as Card & { firstLearnReverse?: FirstLearn }
      ).firstLearnReverse = makeFirstLearn({ isNew: false, isFirst: false });
    }
    await createFirestoreCard(userId, deckId, card);
    dueCardIds.push(cardId);
  }

  const firstLearnCardIds: string[] = [];
  for (let i = 0; i < firstLearnCards; i++) {
    const cardId = generateTestId(`${cardIdPrefix}-fl`);
    const card = makeFirstLearnCard(cardId);
    await createFirestoreCard(userId, deckId, card);
    firstLearnCardIds.push(cardId);
  }

  return { newCardIds, dueCardIds, firstLearnCardIds };
}

/**
 * Builder for future "round-based" scenarios.
 * Creates in-memory cards only; caller decides when/how to persist.
 */
export function buildRoundCardMix(config: RoundCardMixConfig): RoundCardMixResult {
  const {
    newCards,
    dueCards,
    bidirectional = false,
    cardIdPrefix = "round-card",
  } = config;

  const newCardList: Card[] = [];
  for (let i = 0; i < newCards; i++) {
    const card = makeNewCard(`${cardIdPrefix}-new-${i}`);
    if (bidirectional) {
      (card as Card & { cardAlgoReverse?: CardAlgo }).cardAlgoReverse =
        makeCardAlgo();
      (card as Card & { firstLearnReverse?: FirstLearn }).firstLearnReverse =
        makeFirstLearn({ isNew: true });
    }
    newCardList.push(card);
  }

  const dueCardList: Card[] = [];
  for (let i = 0; i < dueCards; i++) {
    const card = makeDueCard(`${cardIdPrefix}-due-${i}`);
    if (bidirectional) {
      (card as Card & { cardAlgoReverse?: CardAlgo }).cardAlgoReverse =
        makeCardAlgo({ due: new Date(Date.now() - 60_000) });
      (card as Card & { firstLearnReverse?: FirstLearn }).firstLearnReverse =
        makeFirstLearn({ isNew: false, isFirst: false });
    }
    dueCardList.push(card);
  }

  return { newCards: newCardList, dueCards: dueCardList };
}
