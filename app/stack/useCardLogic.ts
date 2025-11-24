import { useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { fsrs, Rating, Grades } from "ts-fsrs";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { FSRS_PARAMS } from "./learnScreen.constants";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import {
  placeholderCards,
  placeholderDecks,
} from "../../constants/placeholderData";
import {
  ProgressState,
  TooltipState,
  CardLogicState,
} from "./learnScreen.types";
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
  const [doneCards, setDoneCards] = useState<Card[]>([]);
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
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(false);

  const cardLogicState: CardLogicState = {
    cards,
    isLoading,
    isBack,
    tooltip,
    time,
    index,
    doneCards,
    deck,
    progress,
  };

  function compDueDate(a: any, b: any): number {
    const nowMs = new Date().getTime();

    // Determine due time depending on phase
    const aDue = a.firstLearn?.isNew
      ? a.firstLearn?.due
        ? new Date(a.firstLearn.due).getTime()
        : nowMs
      : a.cardAlgo?.due
      ? new Date(a.cardAlgo.due).getTime()
      : nowMs;
    const bDue = b.firstLearn?.isNew
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

  async function updateCardsEvery(card: any): Promise<void> {
    try {
      if (userCtx.id && card.id) {
        // Only save firstLearn during first repetitions, don't save cardAlgo yet
        if (card.firstLearn?.isNew) {
          // Deep copy: Update firstLearn in cards and copy content on first save
          const cardRef = doc(
            db,
            `users/${userCtx.id}/decks/${id}/cards/${card.id}`
          );

          // Check if card already exists (has content)
          const cardDoc = await getDoc(cardRef);
          const isNewCard = !cardDoc.exists;

          const updateData: any = {
            firstLearn: card.firstLearn,
          };

          // If this is the first time seeing the card, copy content
          if (isNewCard && card.cardData) {
            updateData.front = card.cardData.front || "";
            updateData.back = card.cardData.back || "";
            updateData.tags = Array.isArray(card.cardData.tags)
              ? card.cardData.tags
              : [];
            updateData.contentVersion = Date.now();
            updateData.sourceDeckId = id;
          }

          await setDoc(cardRef, updateData, { merge: true });
        } else {
          // Full FSRS update when card graduates from first learning
          await cloudFunctions.updateCardProgress(
            userCtx.id,
            id, // deck id
            card.id,
            card.grade ?? CardGrade.Wrong,
            card.difficulty || 2.5,
            card.interval || 1,
            card.firstLearn
          );
        }

        console.log(
          "Card progress updated:",
          card.id,
          "firstLearn:",
          card.firstLearn
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

      console.log("Card is:", cards[0]);

      // Easy
      // Second Good Answer
      // Card not in first learning phase

      if (
        type == CardGrade.Easy ||
        (type == CardGrade.Good && cards[0].firstLearn?.consecutiveGood == 1) ||
        (cards[0].firstLearn && !cards[0].firstLearn.isFirst)
      ) {
        /////////////////////////////////////////////////////////////
        // CASE 1: Card graduates to FSRS algorithm
        /////////////////////////////////////////////////////////////

        console.log("Card graduates to FSRS algorithm");
        if (!cards[0] || !cards[0].cardAlgo) {
          throw new Error("Card algo is not defined");
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

        console.log("New card answer:", type);

        const currentCard = cards[0];
        const updatedCard = {
          ...currentCard,
          firstLearn: {
            ...currentCard.firstLearn!,
            isNew: false,
            consecutiveGood: 0,
          },
          seenInSession: true,
          grade: type,
          cardAlgo: newCardAlgo,
        } as any;

        // If card is wrong, set due to 10 minutes from now
        // If card is good, hard, or easy, remove card from current session

        if (type === CardGrade.Wrong) {
          // Wrong answer: set due to 10 minutes from now
          // FSRS wrong -> keep FSRS parameters but force cooldown 10 min
          updatedCard.cardAlgo.due = new Date(now.getTime() + 1000 * 60 * 10);
          let nextCards = [updatedCard, ...cards.slice(1)];
          nextCards = nextCards.sort(compDueDate); // Sort cards by due date
          setCards(nextCards);
          updateCardsEvery(updatedCard);
        } else {
          // Hard/Good/Easy: remove card from current session
          let nextCards = cards.slice(1);
          nextCards = nextCards.sort(compDueDate); // Sort cards by due date
          setCards(nextCards);
          setDoneCards((prev) => [...prev, updatedCard]);
          updateCardsEvery(updatedCard);
        }

        // Update progress

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
      } else {
        console.log("Card is in first learning phase");
        /////////////////////////////////////////////////////////////
        // CASE 2: Card is in first learning phase
        /////////////////////////////////////////////////////////////

        const currentCard = cards[0];
        const baseFirst = { ...currentCard.firstLearn } as FirstLearn;
        const now2 = new Date();

        let updatedFirst = { ...baseFirst } as FirstLearn;
        let grade =
          (currentCard.grade as CardGrade | undefined) ?? CardGrade.NotGraded;
        let newConsecutiveGood = baseFirst.consecutiveGood || 0;

        // Switch case for answer type
        switch (type) {
          case CardGrade.Good:
            newConsecutiveGood = (baseFirst.consecutiveGood || 0) + 1;
            // Check if card should graduate after this good answer
            if (newConsecutiveGood >= 2) {
              throw new Error("Card should graduate");
            } else {
              updatedFirst = {
                ...baseFirst,
                due: new Date(now2.getTime() + 1000 * 60 * 10),
                consecutiveGood: newConsecutiveGood,
              };
              grade = CardGrade.Good;
            }
            break;
          case CardGrade.Hard:
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            updatedFirst = {
              ...baseFirst,
              due: new Date(now2.getTime() + 1000 * 60 * 5),
              consecutiveGood: newConsecutiveGood,
            };
            grade = CardGrade.Hard;
            break;
          case CardGrade.Wrong:
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            updatedFirst = {
              ...baseFirst,
              due: new Date(now2.getTime() + 1000 * 60),
              consecutiveGood: newConsecutiveGood,
            };
            grade = CardGrade.Wrong;
            break;
          default:
            break;
        }
        const updatedCard2 = {
          ...currentCard,
          firstLearn: updatedFirst,
          seenInSession: true,
          grade: grade,
        } as any;

        let nextCards2 = [updatedCard2, ...cards.slice(1)];
        nextCards2 = nextCards2.sort(compDueDate);
        setCards(nextCards2);
        updateCardsEvery(updatedCard2);
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
      console.log("Fetching cards for deck:", id);
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
      console.log(userCtx.id);
      // Ensure user personal copy exists; if not, create it
      try {
        await cloudFunctions.getUserDeckDetails(userCtx.id!, id);
      } catch {
        await cloudFunctions.startLearningDeck(userCtx.id!, id);
      }

      console.log("getUserDeckDetails");

      // Get user deck details
      const { deck: currentDeck } = await cloudFunctions.getUserDeckDetails(
        userCtx.id!,
        id
      );
      console.log("currentDeck", currentDeck);
      const { settings } = await cloudFunctions.getUserSettings(userCtx.id!);
      console.log("settings", settings);
      const dailyGoal = -1; // liczba dziennych powtórek (FSRS) - nie używamy tego w tej wersji
      const dailyNew = settings.dailyNew ?? 20; // liczba nowych kart do wprowadzenia

      if (currentDeck) {
        setDeck(currentDeck);

        // Server-side: fetch due FSRS + due firstLearn + new candidates from user deck
        const [dueRes, newRes] = await Promise.all([
          cloudFunctions.getUserDueDeckCards(userCtx.id!, id, dailyGoal),
          cloudFunctions.getUserNewDeckCards(userCtx.id!, id, dailyNew),
        ]);

        console.log("dueRes", dueRes);
        console.log("newRes", newRes);

        const sessionCards = [...dueRes.cards, ...newRes.cards] as any[];

        // Sort and set
        const sortedSession = sessionCards.sort(compDueDate);
        setCards(sortedSession as any);
        setProgress({
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: sortedSession.length,
          all: sortedSession.length,
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

  async function updateCards(doneCards: Card[]): Promise<void> {
    try {
      if (userCtx.id && doneCards.length > 0) {
        // Update each card's progress using cloud function
        await Promise.all(
          doneCards.map((doneCard) =>
            cloudFunctions.updateCardProgress(
              userCtx.id!,
              id, // deck id
              doneCard.id,
              doneCard.grade ?? CardGrade.Wrong,
              doneCard.cardAlgo?.difficulty ?? 2.5,
              doneCard.cardAlgo?.scheduled_days ?? 1,
              doneCard.firstLearn
            )
          )
        );
        console.log("Updated cards:", doneCards.length);
      }
    } catch (e) {
      console.log("Error updating cards:", e);
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

  // Effect to handle progress changes and navigation
  useEffect(() => {
    if (progress.all === 0) {
      router.replace({
        pathname: "./victoryScreen",
        params: { empty: "true" },
      });
    } else if (progress.todo === 0) {
      updateCards(doneCards);
      router.replace({
        pathname: "./victoryScreen",
        params: { ...progress, empty: "false" },
      });
    }
  }, [progress]);

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
    updateCards,
    clearError: () => setError(null),
    lastAnswerType,
    clearLastAnswerType: () => setLastAnswerType(null),
    currentStreak,
    streakAchieved,
    clearStreakAchieved: () => setStreakAchieved(false),
    streakLost,
  };
}
