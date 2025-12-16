import { useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { fsrs, Rating, Grades } from "ts-fsrs";
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
  Deck,
  FirstLearn,
  CardGrade,
  CardAlgo,
  DeckLearningData,
} from "@/types/schemas";
import { db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

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

  const [cards, setCards] = useState<Card[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBack, setIsBack] = useState<boolean>(false);
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

  const cardLogicState: CardLogicState = {
    cards,
    isLoading,
    isBack,
    tooltip,
    time,
    index,
    deck,
    progress,
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
    scheduledTime: number
  ): Promise<void> {
    try {
      if (userCtx.id && card.id) {
        delete card.seenInSession;
        await cloudFunctions.updateCardProgress(
          userCtx.id,
          id, // deck id
          card,
          scheduledTime
        );
      }
    } catch (e) {
      console.log("Error updating card progress:", e);
    }
  }

  function newCard(type: CardGrade): void {
    try {
      setError(null); // Clear any previous errors

      if (!cards || cards.length === 0) {
        throw new Error("No cards available");
      }

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
            newCardAlgo = newCrd[Rating.Good].card;
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
        } as any;

        // Wrong answer: set due to 10 minutes from now
        // Hard/Good/Easy: remove card from current session

        let nextCards;
        if (type === CardGrade.Wrong) {
          updatedCard.cardAlgo.due = new Date(now.getTime() + 1000 * 60 * 10);
          nextCards = [updatedCard, ...cards.slice(1)];
        } else {
          nextCards = cards.slice(1);
        }

        nextCards = nextCards.sort(compDueDate); // Sort cards by due date
        setCards(nextCards);
        updateCardsEvery(
          updatedCard,
          newCardAlgo.due.getTime() - now.getTime()
        );

        setProgress((prev) => {
          const prevAns = currentCard.grade;
          const newVal = { ...prev };
          if (prevAns != type && prevAns) {
            newVal[type] += 1;
            newVal[prevAns] = Math.max(newVal[prevAns] - 1, 0);
          }
          if (!prevAns) {
            newVal[type] += 1;
          }
          // Only decrease todo when card is actually done (not wrong)
          if (type !== CardGrade.Wrong) {
            newVal.todo -= 1;
          }
          return newVal;
        });

        if (nextCards.length === 0) {
          router.replace({
            pathname: "./victoryScreen",
            params: { ...progress, empty: "false" },
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
            newDue = new Date(now.getTime() + 1000 * 60);
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
        } as Card;

        let nextCards = [updatedCard, ...cards.slice(1)];
        nextCards = nextCards.sort(compDueDate);

        setCards(nextCards);
        updateCardsEvery(updatedCard, newDue.getTime() - now.getTime());
        setProgress((prev) => {
          const prevAns = currentCard.grade;
          const newVal = { ...prev };
          if (prevAns != type && prevAns) {
            newVal[type] += 1;
            newVal[prevAns] = Math.max(newVal[prevAns] - 1, 0);
          }
          if (!prevAns) {
            newVal[type] += 1;
          }
          return newVal;
        });
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
          settings: { zenMode: false },
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
      // Ensure user personal copy exists; if not, create it

      const { deck: userDeck } = await cloudFunctions.getUserDeckDetails(id);
      if (!userDeck) {
        await cloudFunctions.startLearningDeck(id);
      }

      // Get user deck details
      const { deck: currentDeck } = await cloudFunctions.getUserDeckDetails(id);
      const { settings } = await cloudFunctions.getUserSettings(userCtx.id!);

      const dailyGoal = -1; // liczba dziennych powtórek (FSRS) - nie używamy tego w tej wersji
      const dailyNew = settings.dailyNew ?? 20; // liczba nowych kart do wprowadzenia

      if (currentDeck) {
        setDeck(currentDeck);

        // Server-side: fetch due FSRS + due firstLearn + new candidates from user deck
        const [dueRes, newRes] = await Promise.all([
          cloudFunctions.getUserDueDeckCards(id, dailyGoal),
          cloudFunctions.getUserNewDeckCards(id, dailyNew),
        ]);

        const sessionCards = [...dueRes.cards, ...newRes.cards] as Card[];

        if (sessionCards.length === 0) {
          router.replace({
            pathname: "./victoryScreen",
            params: { empty: "true" },
          });
          return;
        }

        // Sort and set
        const sortedSessionCards = sessionCards.sort(compDueDate);
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
      }
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
        params: { ...progress, empty: "false" },
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
