import { useContext, useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { fsrs, Rating } from "ts-fsrs";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { consumeEditedCard } from "../../utils/editedCardStore";
import { FSRS_PARAMS } from "../../app/stack/learnScreen.constants";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import {
  placeholderCards,
  placeholderDecks,
} from "../../constants/placeholderData";
import {
  ProgressState,
  TooltipState,
  CardLogicState,
  SessionItem,
} from "../../app/stack/learnScreen.types";
import {
  Card,
  FirstLearn,
  CardGrade,
  CardAlgo,
  DeckLearningData,
  DailyStats,
} from "@/types/schemas";
import { playSound } from "@/utils/soundTrigger";

const DEFAULT_CARD_ALGO: CardAlgo = {
  difficulty: 2.5,
  scheduled_days: 1,
  due: new Date(),
  reps: 0,
  state: 0,
  stability: 0,
  elapsed_days: 0,
  lapses: 0,
};

const f = fsrs(FSRS_PARAMS);

/**
 * Custom hook for managing card learning logic, FSRS algorithm, and progress tracking
 * @param id - The deck ID for fetching cards
 * @returns Object containing card logic state and functions
 */
export function useCardLogic(id: string) {
  const userCtx = useContext(UserContext);

  const [cards, setCards] = useState<SessionItem[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBack, setIsBack] = useState<boolean>(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ shown: false });
  const [time, setTime] = useState<NodeJS.Timeout | number | undefined>(
    undefined
  );
  const [index, setIndex] = useState<number>(0);
  const [deck, setDeck] = useState<DeckLearningData>();
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressState>({
    easy: 0,
    hard: 0,
    good: 0,
    wrong: 0,
    todo: 10,
    all: 20,
  });

  const [lastAnswerType, setLastAnswerType] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [streakAchieved, setStreakAchieved] = useState<boolean>(false);
  const [streakLost, setStreakLost] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [history, setHistory] = useState<
    {
      item: SessionItem;
      dailyStats: DailyStats | null;
    }[]
  >([]);

  const cardLogicState: CardLogicState = {
    cards,
    isLoading,
    isBack,
    tooltip,
    time,
    index,
    deck,
    progress,
    dailyStats,
  };

  function getItemDue(item: SessionItem): number {
    const nowMs = new Date().getTime();
    const card = item.card;
    if (item.direction === "reverse") {
      const fl = card.firstLearnReverse;
      if (fl?.isFirst || fl?.isNew) {
        return fl.due ? new Date(fl.due).getTime() : nowMs;
      }
      return card.cardAlgoReverse?.due
        ? new Date(card.cardAlgoReverse.due).getTime()
        : nowMs;
    }
    const fl = card.firstLearn;
    if (fl?.isFirst || fl?.isNew) {
      return fl.due ? new Date(fl.due).getTime() : nowMs;
    }
    return card.cardAlgo?.due
      ? new Date(card.cardAlgo.due).getTime()
      : nowMs;
  }

  function compDueDate(a: SessionItem, b: SessionItem): number {
    const nowMs = new Date().getTime();
    const aDue = getItemDue(a);
    const bDue = getItemDue(b);

    // If both are currently due, prioritize items already seen in this session
    const aSeen = a.seenInSession ? 1 : 0;
    const bSeen = b.seenInSession ? 1 : 0;
    if (aDue <= nowMs && bDue <= nowMs) {
      if (aSeen > bSeen) return -1; // a was already seen -> show earlier
      if (bSeen > aSeen) return 1; // b was already seen -> show earlier
    }

    return aDue - bDue;
  }

  async function updateCardsEvery(
    item: SessionItem,
    scheduledTime: number,
    dailyStatsLocal: DailyStats | null
  ): Promise<void> {
    try {
      if (userCtx.id && item.card.id) {
        const cardToUpdate: Card = JSON.parse(JSON.stringify(item.card));
        await cloudFunctions.updateCardProgress(
          userCtx.id,
          id, // deck id
          cardToUpdate,
          scheduledTime,
          dailyStatsLocal ?? undefined,
          item.direction
        );
      }
    } catch (e) {
      console.log("Error updating card progress:", e);
    }
  }
  async function goBackInHistory(): Promise<void> {
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      const newDailyStats = lastEntry.dailyStats;
      setCards((prev) => {
        const newCards = [...(prev ?? [])];
        newCards.unshift(lastEntry.item);
        return newCards;
      });
      setHistory(history.slice(0, history.length - 1));
      setDailyStats(newDailyStats);

      const cardToUndo: Card = JSON.parse(JSON.stringify(lastEntry.item.card));
      try {
        if (!newDailyStats) {
          throw new Error("Daily stats are not defined");
        }
        await cloudFunctions.undoCard(
          id,
          cardToUndo,
          newDailyStats
        );
      } catch (error) {
        console.error("Error undoing card:", error);
      }
    }
  }

  function newCard(type: CardGrade): void {
    const now = new Date();
    try {
      setError(null); // Clear any previous errors

      if (!cards || cards.length === 0) {
        throw new Error("No cards available");
      }

      if (type === CardGrade.Good) {
        playSound("good");
      } else if (type === CardGrade.Wrong) {
        playSound("wrong");
      } else if (type === CardGrade.Hard) {
        playSound("hard");
      } else if (type === CardGrade.Easy) {
        playSound("easy");
      }

      setIsBack(false);

      const currentItem = cards[0];
      const isReverse = currentItem.direction === "reverse";
      const currentCard = currentItem.card;

      // Pick the correct firstLearn / cardAlgo based on direction
      const firstLearn = isReverse
        ? currentCard.firstLearnReverse
        : currentCard.firstLearn;
      const cardAlgoField = isReverse
        ? currentCard.cardAlgoReverse
        : currentCard.cardAlgo;

      // Easy / Second Good / Card not in first learning phase
      if (
        type == CardGrade.Easy ||
        (type == CardGrade.Good && firstLearn?.consecutiveGood == 1) ||
        (firstLearn && !firstLearn.isFirst && !firstLearn.isNew)
      ) {
        /////////////////////////////////////////////////////////////
        // CASE 1: Card graduates to FSRS algorithm
        /////////////////////////////////////////////////////////////
        const algoBase = cardAlgoField ?? DEFAULT_CARD_ALGO;
        const newCrd = f.repeat(algoBase, now);
        let newCardAlgo: CardAlgo;
        switch (type) {
          case CardGrade.Wrong:
            newCardAlgo = newCrd[Rating.Again].card;
            break;
          case CardGrade.Hard:
            newCardAlgo = newCrd[Rating.Hard].card;
            break;
          case CardGrade.Good:
            newCardAlgo = f.repeat(newCrd[Rating.Good].card, now)[Rating.Good]
              .card;
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

        // Build updated card with correct direction fields
        const updatedCard: Card = isReverse
          ? {
              ...currentCard,
              firstLearnReverse: updatedFirstLearn,
              cardAlgoReverse: newCardAlgo,
              grade: type,
            }
          : {
              ...currentCard,
              firstLearn: updatedFirstLearn,
              cardAlgo: newCardAlgo,
              grade: type,
            };

        const updatedItem: SessionItem = {
          ...currentItem,
          card: updatedCard,
          seenInSession: true,
        };

        let dailyStatsLocal = dailyStats;
        const historyStats = { ...dailyStatsLocal } as DailyStats;

        if (dailyStatsLocal) {
          if (firstLearn?.isNew) {
            dailyStatsLocal.newCardsRemaining = Math.max(
              0,
              dailyStatsLocal.newCardsRemaining - 1
            );
            dailyStatsLocal.completedNewToday += 1;
          } else if (!firstLearn?.isNew && firstLearn?.isFirst) {
            dailyStatsLocal.inProgressNewCards = Math.max(
              0,
              dailyStatsLocal.inProgressNewCards - 1
            );
            dailyStatsLocal.completedNewToday += 1;
          } else if (
            !firstLearn?.isFirst &&
            type !== CardGrade.Wrong &&
            currentItem.seenInSession
          ) {
            dailyStatsLocal.inProgressDueCards = Math.max(
              0,
              dailyStatsLocal.inProgressDueCards - 1
            );
            dailyStatsLocal.completedDueToday += 1;
          } else if (
            !firstLearn?.isFirst &&
            type !== CardGrade.Wrong &&
            !currentItem.seenInSession
          ) {
            dailyStatsLocal.dueCardsRemaining = Math.max(
              0,
              dailyStatsLocal.dueCardsRemaining - 1
            );
            dailyStatsLocal.completedDueToday += 1;
          } else if (!firstLearn?.isFirst && !currentItem.seenInSession) {
            dailyStatsLocal.dueCardsRemaining = Math.max(
              0,
              dailyStatsLocal.dueCardsRemaining - 1
            );
            dailyStatsLocal.inProgressDueCards += 1;
          }
        }

        let nextCards: SessionItem[];
        if (type === CardGrade.Wrong) {
          const wrongAlgo = isReverse
            ? { ...updatedCard.cardAlgoReverse!, due: new Date(now.getTime() + 1000 * 60 * 10) }
            : { ...updatedCard.cardAlgo!, due: new Date(now.getTime() + 1000 * 60 * 10) };
          const wrongCard: Card = isReverse
            ? { ...updatedCard, cardAlgoReverse: wrongAlgo }
            : { ...updatedCard, cardAlgo: wrongAlgo };
          nextCards = [{ ...updatedItem, card: wrongCard }, ...cards.slice(1)];
        } else {
          nextCards = cards.slice(1);
        }

        setHistory([...history, { item: currentItem, dailyStats: historyStats }]);
        nextCards = nextCards.sort(compDueDate);

        setCards(nextCards);
        updateCardsEvery(
          updatedItem,
          newCardAlgo.due.getTime() - now.getTime(),
          dailyStatsLocal
        );
        setDailyStats(dailyStatsLocal);
        setProgress((prev) => ({
          ...prev,
          easy: type === CardGrade.Easy ? prev.easy + 1 : prev.easy,
          good: type === CardGrade.Good ? prev.good + 1 : prev.good,
          hard: type === CardGrade.Hard ? prev.hard + 1 : prev.hard,
          wrong: type === CardGrade.Wrong ? prev.wrong + 1 : prev.wrong,
          todo: nextCards.length,
        }));

        if (nextCards.length === 0) {
          router.replace({
            pathname: "./victoryScreen",
            params: {
              completedNewToday: dailyStatsLocal?.completedNewToday,
              completedDueToday: dailyStatsLocal?.completedDueToday,
              empty: "false",
              finished: "true",
            },
          });
        }
      } else {
        /////////////////////////////////////////////////////////////
        // CASE 2: Card is in first learning phase
        /////////////////////////////////////////////////////////////

        const baseFirst = { ...(firstLearn ?? { isNew: true }) } as FirstLearn;
        const nowLocal = new Date();

        let newConsecutiveGood = baseFirst.consecutiveGood || 0;
        let newDue = new Date();
        switch (type) {
          case CardGrade.Good:
            newConsecutiveGood = (baseFirst.consecutiveGood || 0) + 1;
            newDue = new Date(nowLocal.getTime() + 1000 * 60 * 10);
            break;
          case CardGrade.Hard:
            newConsecutiveGood = 0;
            newDue = new Date(nowLocal.getTime() + 1000 * 60 * 5);
            break;
          case CardGrade.Wrong:
            newConsecutiveGood = 0;
            newDue = new Date(nowLocal.getTime() + 1000 * 60 * 2);
            break;
          default:
            break;
        }

        const updatedFirst = {
          ...baseFirst,
          due: newDue,
          isFirst: true,
          isNew: false,
          consecutiveGood: newConsecutiveGood,
        } as FirstLearn;

        const updatedCard: Card = isReverse
          ? { ...currentCard, firstLearnReverse: updatedFirst, grade: type }
          : { ...currentCard, firstLearn: updatedFirst, grade: type };

        const updatedItem: SessionItem = {
          ...currentItem,
          card: updatedCard,
          seenInSession: true,
        };

        let nextCards = [updatedItem, ...cards.slice(1)];
        nextCards = nextCards.sort(compDueDate);

        let dailyStatsLocal = dailyStats;
        const historyStats = { ...dailyStatsLocal } as DailyStats;

        if (dailyStatsLocal && firstLearn?.isNew) {
          dailyStatsLocal.newCardsRemaining = Math.max(
            0,
            dailyStatsLocal.newCardsRemaining - 1
          );
          dailyStatsLocal.inProgressNewCards += 1;
        }

        setHistory([...history, { item: currentItem, dailyStats: historyStats }]);
        setDailyStats(dailyStatsLocal);
        setCards(nextCards);
        setProgress((prev) => ({
          ...prev,
          good: type === CardGrade.Good ? prev.good + 1 : prev.good,
          hard: type === CardGrade.Hard ? prev.hard + 1 : prev.hard,
          wrong: type === CardGrade.Wrong ? prev.wrong + 1 : prev.wrong,
          todo: nextCards.length,
        }));
        updateCardsEvery(
          updatedItem,
          newDue.getTime() - nowLocal.getTime(),
          dailyStatsLocal
        );

        if (nextCards.length === 0) {
          setIsFinished(true);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while processing the card";
      setError(errorMessage);
      console.error("Error in newCard:", error);
    }
  }

  async function fetchCards(): Promise<void> {
    try {
      setIsLoading(true);

      if (PLACEHOLDER_MODE) {
        // Tryb placeholder: użyj przykładowych kart
        const placeholderDeck = placeholderDecks[0];
        setDeck({
          id: placeholderDeck.id,
          title: placeholderDeck.title,
          cardsNum: placeholderDeck.cardsNum,
          settings: { zenMode: false, shuffleNewCards: false },
        } as DeckLearningData);

        // Przekształć placeholderCards na format SessionItem
        const transformedItems: SessionItem[] = placeholderCards.map(
          (card) =>
            ({
              card: {
                id: card.id,
                cardData: card.cardData,
                firstLearn: {
                  isNew: true,
                  isFirst: true,
                  due: new Date(),
                  consecutiveGood: 0,
                },
              } as Card,
              direction: "forward" as const,
            })
        );

        setCards(transformedItems);
        setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: transformedItems.length,
          all: transformedItems.length,
        });
        setIsLoading(false);
        return;
      }

      const { items, dailyStats, deck } =
        await cloudFunctions.startLearningSession(id);

      setDeck(deck);
      setDailyStats(dailyStats);

      if (items.length === 0) {
        router.replace({
          pathname: "./victoryScreen",
          params: { empty: "true" },
        });
        return;
      }

      // Sort and set
      const sessionItems: SessionItem[] = items.map((item) => ({
        card: item.card,
        direction: item.direction as "forward" | "reverse",
      }));
      const sortedSessionItems = sessionItems.sort(compDueDate);
      setCards(sortedSessionItems);
      setProgress({
        easy: 0,
        hard: 0,
        good: 0,
        wrong: 0,
        todo: sortedSessionItems.length,
        all: sortedSessionItems.length,
      });
      // Reset streak when starting new session
      setCurrentStreak(0);
      setStreakAchieved(false);
      setStreakLost(false);
    } catch (e) {
      console.log("Error fetching cards:", e);
      setError("Failed to fetch cards");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  // Effect to manage tooltip
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | number | undefined = undefined;

    if (tooltip.shown) {
      if (time) {
        clearTimeout(time);
      }
      timeoutId = setTimeout(() => {
        setTooltip((prev) => {
          const newVal = { ...prev };
          newVal.shown = false;
          return newVal;
        });
      }, 2000);
      setTime(timeoutId);
    } else {
      setTime(undefined);
    }

    // Cleanup timeout on unmount or when tooltip changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [tooltip]);

  useEffect(() => {
    if (isFinished) {
      router.replace({
        pathname: "./victoryScreen",
        params: {
          completedNewToday: dailyStats?.completedNewToday,
          completedDueToday: dailyStats?.completedDueToday,
          empty: "false",
          finished: "true",
        },
      });
    }
  }, [isFinished]);

  // Effect to fetch cards on mount
  useEffect(() => {
    fetchCards();
  }, []);

  /**
   * Checks if a card was edited and updates local state accordingly.
   * Called when the screen regains focus after returning from the edit screen.
   */
  const applyEditedCard = useCallback(() => {
    const edited = consumeEditedCard();
    if (!edited) return;

    setCards((prev) => {
      if (!prev || prev.length === 0) return prev;
      const idx = prev.findIndex((item) => item.card.id === edited.cardId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        card: {
          ...updated[idx].card,
          cardData: { front: edited.front, back: edited.back },
          tags: edited.tags,
        },
      };
      return updated;
    });
  }, []);

  // Wrapper for newCard to track last answer and streak
  const newCardWithTracking = (type: CardGrade): void => {
    setLastAnswerType(type.toString());

    // Update streak logic
    if (type === CardGrade.Good || type === CardGrade.Easy) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setStreakLost(false); // Clear streak lost flag

      // Trigger streak celebration at 5
      if (newStreak === 5) {
        setStreakAchieved(true);
        // Reset after a moment to allow for animation
        setTimeout(() => {
          setStreakAchieved(false);
        }, 2000);
      }
    } else if (type === CardGrade.Wrong || type === CardGrade.Hard) {
      // Check if we're losing a streak (had streak > 0)
      if (currentStreak > 0) {
        setStreakLost(true);
        // Clear streak lost flag after animation
        setTimeout(() => {
          setStreakLost(false);
        }, 800);
      }
      // Reset streak on wrong/hard answer
      setCurrentStreak(0);
    }

    newCard(type);
  };

  return {
    cardLogicState,
    error,
    goBackInHistory,
    history,
    setCards,
    setIsBack,
    setTooltip,
    setProgress,
    newCard: newCardWithTracking,
    clearError: () => setError(null),
    lastAnswerType,
    clearLastAnswerType: () => setLastAnswerType(null),
    currentStreak,
    streakAchieved,
    clearStreakAchieved: () => setStreakAchieved(false),
    streakLost,
    applyEditedCard,
  };
}
