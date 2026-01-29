import { useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { fsrs, Rating } from "ts-fsrs";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
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
const now = new Date();

/**
 * Custom hook for managing card learning logic, FSRS algorithm, and progress tracking
 * @param id - The deck ID for fetching cards
 * @returns Object containing card logic state and functions
 */
export function useCardLogic(id: string) {
  const userCtx = useContext(UserContext);

  const [cards, setCards] = useState<(Card & { seenInSession?: boolean })[]>();
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
      card: Card & { seenInSession?: boolean };
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

  function compDueDate(a: any, b: any): number {
    const nowMs = new Date().getTime();

    // Determine due time depending on phase
    const aDue =
      a.firstLearn?.isFirst || a.firstLearn?.isNew
        ? a.firstLearn?.due
          ? new Date(a.firstLearn.due).getTime()
          : nowMs
        : a.cardAlgo?.due
        ? new Date(a.cardAlgo.due).getTime()
        : nowMs;
    const bDue =
      b.firstLearn?.isFirst || b.firstLearn?.isNew
        ? b.firstLearn?.due
          ? new Date(b.firstLearn.due).getTime()
          : nowMs
        : b.cardAlgo?.due
        ? new Date(b.cardAlgo.due).getTime()
        : nowMs;

    // If both are currently due, prioritize cards already seen in this session
    const aSeen = a.seenInSession ? 1 : 0;
    const bSeen = b.seenInSession ? 1 : 0;
    if (aDue <= nowMs && bDue <= nowMs) {
      if (aSeen > bSeen) return -1; // a was already seen -> show earlier
      if (bSeen > aSeen) return 1; // b was already seen -> show earlier
    }

    return aDue - bDue;
  }

  async function updateCardsEvery(
    card: Card & { seenInSession?: boolean },
    scheduledTime: number,
    dailyStatsLocal: DailyStats | null
  ): Promise<void> {
    try {
      if (userCtx.id && card.id) {
        const cardToUpdate = JSON.parse(JSON.stringify(card));
        delete cardToUpdate.seenInSession;
        await cloudFunctions.updateCardProgress(
          userCtx.id,
          id, // deck id
          cardToUpdate,
          scheduledTime,
          dailyStatsLocal ?? undefined
        );
      }
    } catch (e) {
      console.log("Error updating card progress:", e);
    }
  }
  async function goBackInHistory(): Promise<void> {
    if (history.length > 0) {
      const newDailyStats = history[history.length - 1].dailyStats;
      setCards((prev) => {
        const newCards = [...(prev ?? [])];
        newCards.unshift(history[history.length - 1].card);
        return newCards;
      });
      setHistory(history.slice(0, history.length - 1));
      setDailyStats(newDailyStats);
      
      const cardToUndo = JSON.parse(JSON.stringify(history[history.length - 1].card));
      delete cardToUndo.seenInSession;
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

      // Easy
      // Second Good Answer
      // Card not in first learning phase

      if (
        type == CardGrade.Easy ||
        (type == CardGrade.Good && cards[0].firstLearn?.consecutiveGood == 1) ||
        (cards[0].firstLearn &&
          !cards[0].firstLearn.isFirst &&
          !cards[0].firstLearn.isNew)
      ) {
        /////////////////////////////////////////////////////////////
        // CASE 1: Card graduates to FSRS algorithm
        /////////////////////////////////////////////////////////////
        if (!cards[0]) {
          throw new Error("Card algo is not defined");
        }
        if (!cards[0].cardAlgo) {
          cards[0].cardAlgo = DEFAULT_CARD_ALGO;
        }
        // Card graduates to FSRS algorithm
        const newCrd = f.repeat(cards[0].cardAlgo, now);
        let newCardAlgo: CardAlgo;
        // Switch case for answer type
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

        const currentCard = cards[0];
        const updatedCard = {
          ...currentCard,
          firstLearn: {
            ...currentCard.firstLearn!,
            isNew: false,
            isFirst: false,
            consecutiveGood: 0,
          },
          seenInSession: true,
          grade: type,
          cardAlgo: newCardAlgo,
        } as Card;

        // Wrong answer: set due to 10 minutes from now
        // Hard/Good/Easy: remove card from current session

        let dailyStatsLocal = dailyStats;
        const historyStats = { ...dailyStatsLocal } as DailyStats; // Deep copy of daily stats

        if (dailyStatsLocal) {
          if (cards[0].firstLearn?.isNew) {
            dailyStatsLocal.newCardsRemaining = Math.max(
              0,
              dailyStatsLocal.newCardsRemaining - 1
            );
            dailyStatsLocal.completedNewToday += 1;
          } else if (
            !cards[0].firstLearn?.isNew &&
            cards[0].firstLearn?.isFirst
          ) {
            dailyStatsLocal.inProgressNewCards = Math.max(
              0,
              dailyStatsLocal.inProgressNewCards - 1
            );
            dailyStatsLocal.completedNewToday += 1;
          } else if (
            !cards[0].firstLearn?.isFirst &&
            type !== CardGrade.Wrong &&
            cards[0].seenInSession
          ) {
            dailyStatsLocal.inProgressDueCards = Math.max(
              0,
              dailyStatsLocal.inProgressDueCards - 1
            );
            dailyStatsLocal.completedDueToday += 1;
          } else if (
            !cards[0].firstLearn?.isFirst &&
            type !== CardGrade.Wrong &&
            !cards[0].seenInSession
          ) {
            dailyStatsLocal.dueCardsRemaining = Math.max(
              0,
              dailyStatsLocal.dueCardsRemaining - 1
            );
            dailyStatsLocal.completedDueToday += 1;
          } else if (!cards[0].firstLearn?.isFirst && !cards[0].seenInSession) {
            dailyStatsLocal.dueCardsRemaining = Math.max(
              0,
              dailyStatsLocal.dueCardsRemaining - 1
            );
            dailyStatsLocal.inProgressDueCards += 1;
          }
        }

        let nextCards: (Card & { seenInSession?: boolean })[];
        if (type === CardGrade.Wrong) {
          updatedCard.cardAlgo!.due = new Date(now.getTime() + 1000 * 60 * 10);
          nextCards = [updatedCard, ...cards.slice(1)];
        } else {
          nextCards = cards.slice(1);
        }

        setHistory([...history, { card: cards[0], dailyStats: historyStats }]);
        nextCards = nextCards.sort(compDueDate); // Sort cards by due date


        setCards(nextCards);
        updateCardsEvery(
          updatedCard,
          newCardAlgo.due.getTime() - now.getTime(),
          dailyStatsLocal
        );
        setDailyStats(dailyStatsLocal);

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

        const currentCard = cards[0];
        const baseFirst = { ...currentCard.firstLearn } as FirstLearn;
        const now = new Date();

        let newConsecutiveGood = baseFirst.consecutiveGood || 0;
        let newDue = new Date();
        // Switch case for answer type
        switch (type) {
          case CardGrade.Good:
            newConsecutiveGood = (baseFirst.consecutiveGood || 0) + 1;
            newDue = new Date(now.getTime() + 1000 * 60 * 10);
            break;
          case CardGrade.Hard:
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            newDue = new Date(now.getTime() + 1000 * 60 * 5);
            break;
          case CardGrade.Wrong:
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            newDue = new Date(now.getTime() + 1000 * 60 * 2);
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

        const updatedCard = {
          ...currentCard,
          firstLearn: updatedFirst,
          seenInSession: true,
          grade: type,
        } as Card & { seenInSession?: boolean };

        let nextCards = [updatedCard, ...cards.slice(1)];
        nextCards = nextCards.sort(compDueDate);

        let dailyStatsLocal = dailyStats;
        const historyStats = { ...dailyStatsLocal } as DailyStats; // Deep copy of daily stats

        if (dailyStatsLocal) {
          if (currentCard.firstLearn?.isNew == true) {
            dailyStatsLocal.newCardsRemaining = Math.max(
              0,
              dailyStatsLocal.newCardsRemaining - 1
            );
            dailyStatsLocal.inProgressNewCards += 1;
          }
        }

        setHistory([...history, { card: cards[0], dailyStats: historyStats }]);
        setDailyStats(dailyStatsLocal);
        setCards(nextCards);
        updateCardsEvery(
          updatedCard,
          newDue.getTime() - now.getTime(),
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

        // Przekształć placeholderCards na format Card
        const transformedCards: Card[] = placeholderCards.map(
          (card, idx) =>
            ({
              id: card.id,
              cardData: card.cardData,
              firstLearn: {
                isNew: true,
                isFirst: true,
                due: new Date(),
                consecutiveGood: 0,
              },
            } as Card)
        );

        setCards(transformedCards);
        setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: transformedCards.length,
          all: transformedCards.length,
        });
        setIsLoading(false);
        return;
      }

      const { cards, dailyStats, deck } =
        await cloudFunctions.startLearningSession(id);

      setDeck(deck);
      setDailyStats(dailyStats);

      if (cards.length === 0) {
        router.replace({
          pathname: "./victoryScreen",
          params: { empty: "true" },
        });
        return;
      }

      // Sort and set
      const sortedSessionCards = cards.sort(compDueDate);
      setCards(sortedSessionCards as Card[]);
      setProgress({
        easy: 0,
        hard: 0,
        good: 0,
        wrong: 0,
        todo: sortedSessionCards.length,
        all: sortedSessionCards.length,
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
  };
}
