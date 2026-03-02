import { fsrs, Rating } from "ts-fsrs";
import { FSRS_PARAMS } from "../app/stack/learnScreen.constants";
import {
  DEFAULT_CARD_ALGO,
  FIRST_LEARN_DELAY_GOOD_MS,
  FIRST_LEARN_DELAY_HARD_MS,
  FIRST_LEARN_DELAY_WRONG_MS,
  FSRS_WRONG_SESSION_DELAY_MS,
} from "../constants/learningConstants";
import {
  Card,
  FirstLearn,
  CardGrade,
  CardAlgo,
  DailyStats,
} from "@/types/schemas";
import type { SessionItem } from "../app/stack/learnScreen.types";

const f = fsrs(FSRS_PARAMS);

export interface EvaluateResult {
  updatedItem: SessionItem; // correct FSRS/firstLearn data → API
  sessionItem: SessionItem | null; // null = remove from queue; otherwise requeue
  scheduledTimeDelta: number; // ms delta for updateCardProgress
  newStats: DailyStats | null; // immutably updated stats
}

export function getItemDue(item: SessionItem, nowMs?: number): number {
  const now = nowMs ?? new Date().getTime();
  const card = item.card;
  if (item.direction === "reverse") {
    const fl = card.firstLearnReverse;
    if (fl?.isFirst || fl?.isNew) {
      return fl.due ? new Date(fl.due).getTime() : now;
    }
    return card.cardAlgoReverse?.due
      ? new Date(card.cardAlgoReverse.due).getTime()
      : now;
  }
  const fl = card.firstLearn;
  if (fl?.isFirst || fl?.isNew) {
    return fl.due ? new Date(fl.due).getTime() : now;
  }
  return card.cardAlgo?.due ? new Date(card.cardAlgo.due).getTime() : now;
}

export function compDueDate(a: SessionItem, b: SessionItem): number {
  const nowMs = new Date().getTime();
  const aDue = getItemDue(a, nowMs);
  const bDue = getItemDue(b, nowMs);

  // If both are currently due, prioritize items already seen in this session
  const aSeen = a.seenInSession ? 1 : 0;
  const bSeen = b.seenInSession ? 1 : 0;
  if (aDue <= nowMs && bDue <= nowMs) {
    if (aSeen > bSeen) return -1; // a was already seen → show earlier
    if (bSeen > aSeen) return 1; // b was already seen → show earlier
  }

  return aDue - bDue;
}

export function evaluateCardAnswer(
  currentItem: SessionItem,
  grade: CardGrade,
  currentStats: DailyStats | null
): EvaluateResult {
  const now = new Date();
  const nowMs = now.getTime();
  const isReverse = currentItem.direction === "reverse";
  const currentCard = currentItem.card;

  const firstLearn = isReverse
    ? currentCard.firstLearnReverse
    : currentCard.firstLearn;
  const cardAlgoField = isReverse
    ? currentCard.cardAlgoReverse
    : currentCard.cardAlgo;

  const isCase1 =
    grade === CardGrade.Easy ||
    (grade === CardGrade.Good && firstLearn?.consecutiveGood === 1) ||
    (firstLearn != null && !firstLearn.isFirst && !firstLearn.isNew);

  if (isCase1) {
    /////////////////////////////////////////////////////////////////////
    // CASE 1 — FSRS graduation
    /////////////////////////////////////////////////////////////////////
    const algoBase: CardAlgo = cardAlgoField ?? { ...DEFAULT_CARD_ALGO, due: now };
    const newCrd = f.repeat(algoBase, now);
    let newCardAlgo: CardAlgo;
    switch (grade) {
      case CardGrade.Wrong:
        newCardAlgo = newCrd[Rating.Again].card;
        break;
      case CardGrade.Hard:
        newCardAlgo = newCrd[Rating.Hard].card;
        break;
      case CardGrade.Good:
        newCardAlgo = f.repeat(newCrd[Rating.Good].card, now)[Rating.Good].card;
        break;
      case CardGrade.Easy:
        newCardAlgo = newCrd[Rating.Easy].card;
        break;
      default:
        newCardAlgo = newCrd[Rating.Again].card;
        break;
    }

    const updatedFirstLearn = {
      ...firstLearn!,
      isNew: false,
      isFirst: false,
      consecutiveGood: 0,
    } as FirstLearn;

    const updatedCard: Card = isReverse
      ? {
          ...currentCard,
          firstLearnReverse: updatedFirstLearn,
          cardAlgoReverse: newCardAlgo,
          grade,
        }
      : {
          ...currentCard,
          firstLearn: updatedFirstLearn,
          cardAlgo: newCardAlgo,
          grade,
        };

    const updatedItem: SessionItem = {
      ...currentItem,
      card: updatedCard,
      seenInSession: true,
    };

    // Immutable stats update
    let newStats: DailyStats | null = null;
    if (currentStats !== null) {
      newStats = { ...currentStats };
      if (firstLearn?.isNew) {
        newStats.newCardsRemaining = Math.max(0, newStats.newCardsRemaining - 1);
        newStats.completedNewToday += 1;
      } else if (!firstLearn?.isNew && firstLearn?.isFirst) {
        newStats.inProgressNewCards = Math.max(0, newStats.inProgressNewCards - 1);
        newStats.completedNewToday += 1;
      } else if (
        !firstLearn?.isFirst &&
        grade !== CardGrade.Wrong &&
        currentItem.seenInSession
      ) {
        newStats.inProgressDueCards = Math.max(0, newStats.inProgressDueCards - 1);
        newStats.completedDueToday += 1;
      } else if (
        !firstLearn?.isFirst &&
        grade !== CardGrade.Wrong &&
        !currentItem.seenInSession
      ) {
        newStats.dueCardsRemaining = Math.max(0, newStats.dueCardsRemaining - 1);
        newStats.completedDueToday += 1;
      } else if (!firstLearn?.isFirst && !currentItem.seenInSession) {
        // Wrong && !seenInSession
        newStats.dueCardsRemaining = Math.max(0, newStats.dueCardsRemaining - 1);
        newStats.inProgressDueCards += 1;
      }
      // Wrong && seenInSession → no stats change (copy of currentStats)
    }

    // Session item: wrong cards get requeued with a session delay; others leave queue
    let sessionItem: SessionItem | null;
    if (grade === CardGrade.Wrong) {
      const wrongCard: Card = isReverse
        ? {
            ...updatedCard,
            cardAlgoReverse: {
              ...newCardAlgo,
              due: new Date(nowMs + FSRS_WRONG_SESSION_DELAY_MS),
            },
          }
        : {
            ...updatedCard,
            cardAlgo: {
              ...newCardAlgo,
              due: new Date(nowMs + FSRS_WRONG_SESSION_DELAY_MS),
            },
          };
      sessionItem = { ...updatedItem, card: wrongCard };
    } else {
      sessionItem = null;
    }

    return {
      updatedItem,
      sessionItem,
      scheduledTimeDelta: newCardAlgo.due.getTime() - nowMs,
      newStats,
    };
  } else {
    /////////////////////////////////////////////////////////////////////
    // CASE 2 — First learning phase
    /////////////////////////////////////////////////////////////////////
    const delayMs =
      grade === CardGrade.Good
        ? FIRST_LEARN_DELAY_GOOD_MS
        : grade === CardGrade.Hard
        ? FIRST_LEARN_DELAY_HARD_MS
        : FIRST_LEARN_DELAY_WRONG_MS;

    const newConsecutiveGood =
      grade === CardGrade.Good ? (firstLearn?.consecutiveGood ?? 0) + 1 : 0;

    const updatedFirst: FirstLearn = {
      ...(firstLearn ?? { isNew: true }),
      due: new Date(nowMs + delayMs),
      isFirst: true,
      isNew: false,
      consecutiveGood: newConsecutiveGood,
    };

    const updatedCard: Card = isReverse
      ? { ...currentCard, firstLearnReverse: updatedFirst, grade }
      : { ...currentCard, firstLearn: updatedFirst, grade };

    const updatedItem: SessionItem = {
      ...currentItem,
      card: updatedCard,
      seenInSession: true,
    };

    let newStats: DailyStats | null = null;
    if (currentStats !== null && firstLearn?.isNew) {
      newStats = {
        ...currentStats,
        newCardsRemaining: Math.max(0, currentStats.newCardsRemaining - 1),
        inProgressNewCards: currentStats.inProgressNewCards + 1,
      };
    }

    return {
      updatedItem,
      sessionItem: { ...updatedItem },
      scheduledTimeDelta: delayMs,
      newStats,
    };
  }
}
