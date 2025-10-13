import { useContext, useEffect, useState } from "react";
import { router } from "expo-router";
import { fsrs, Rating, Grades } from "ts-fsrs";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { FSRS_PARAMS } from "./learnScreen.constants";
import {
  Card,
  DoneCard,
  Deck,
  ProgressState,
  TooltipState,
  CardLogicState,
} from "./learnScreen.types";
import { log } from "console";
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

  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBack, setIsBack] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ shown: false });
  const [time, setTime] = useState<NodeJS.Timeout | number | undefined>(
    undefined
  );
  const [index, setIndex] = useState<number>(0);
  const [doneCards, setDoneCards] = useState<DoneCard[]>([]);
  const [deck, setDeck] = useState<Deck>({});
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressState>({
    easy: 0,
    hard: 0,
    good: 0,
    wrong: 0,
    todo: 10,
    all: 20,
  });

  const cardLogicState: CardLogicState = {
    cards,
    isLoading,
    isBack,
    tooltip,
    time,
    index,
    doneCards,
    deck,
    isNew: false, // Always false now since we use global decks
    progress,
  };

  useEffect(() => {
    console.log("cardLogicState", progress);
  }, [progress]);

  function compDueDate(a: any, b: any): number {
    const nowMs = Date.now();

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
          // Just update firstLearn, don't touch cardAlgo during first repetitions
          const cardRef = doc(db, `decks/${id}/cards/${card.id}`);
          await setDoc(
            cardRef,
            {
              firstLearn: card.firstLearn,
            },
            { merge: true }
          );
        } else {
          // Full FSRS update when card graduates from first learning
          await cloudFunctions.updateCardProgress(
            userCtx.id,
            id, // deck id
            card.id,
            card.grade || 0,
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

  function newCard(type: string): void {
    try {
      setError(null); // Clear any previous errors

      if (!cards || cards.length === 0) {
        throw new Error("No cards available");
      }

      if (
        (cards[0].firstLearn && cards[0].firstLearn.consecutiveGood >= 2) ||
        type == "easy" ||
        !cards[0].firstLearn?.isNew
      ) {
        // Card graduates to FSRS algorithm
        const newCrd = f.repeat(cards[0].cardAlgo, now);
        let ans: string = "";
        let newCardAlgo: any;
        switch (type) {
          case "wrong":
            ans = type;
            newCardAlgo = newCrd[Rating.Again].card;
            break;
          case "hard":
            ans = type;
            newCardAlgo = newCrd[Rating.Hard].card;
            break;
          case "good":
            newCardAlgo = newCrd[Rating.Good].card;
            break;
          case "easy":
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
            consecutiveGood: 0,
          },
          seenInSession: true,
          prevAns: ans,
          cardAlgo: newCardAlgo,
        } as any;

        if (type === "wrong") {
          // Wrong answer: set due to 10 minutes from now
          // FSRS wrong -> keep FSRS parameters but force cooldown 10 min
          updatedCard.cardAlgo.due = new Date(now.getTime() + 1000 * 60 * 10);
          let nextCards = [updatedCard, ...cards.slice(1)];
          nextCards = nextCards.sort(compDueDate);
          setCards(nextCards);
          updateCardsEvery(updatedCard);
        } else {
          // Hard/Good/Easy: remove card from current session
          let nextCards = cards.slice(1);
          nextCards = nextCards.sort(compDueDate);
          setCards(nextCards);

          // Add to done cards
          setDoneCards((prev) => [...prev, updatedCard]);
          updateCardsEvery(updatedCard);
        }

        setProgress((prev) => {
          const prevAns = currentCard.prevAns;
          const newVal = { ...prev };
          if (prevAns != type && prevAns) {
            newVal[type] += 1;
            newVal[prevAns] = Math.max(newVal[prevAns] - 1, 0);
          }
          if (!prevAns) {
            newVal[type] += 1;
          }
          // Only decrease todo when card is actually done (not wrong)
          if (type !== "wrong") {
            newVal.todo -= 1;
          }
          return newVal;
        });
      } else {
        const currentCard2 = cards[0];
        const baseFirst = { ...currentCard2.firstLearn } as any;
        const now2 = new Date();
        let updatedFirst = { ...baseFirst } as any;
        let updatedPrevAns = currentCard2.prevAns as any;
        let newConsecutiveGood = baseFirst.consecutiveGood || 0;

        switch (type) {
          case "good":
            newConsecutiveGood = (baseFirst.consecutiveGood || 0) + 1;
            // Check if card should graduate after this good answer
            if (newConsecutiveGood >= 2) {
              // Card graduates! Remove from current cards and add to done
              const graduatedCard = {
                ...currentCard2,
                firstLearn: {
                  ...baseFirst,
                  isNew: false,
                  consecutiveGood: newConsecutiveGood,
                },
                prevAns: type,
              } as any;

              let nextCards3 = cards.slice(1);
              nextCards3 = nextCards3.sort(compDueDate);
              setCards(nextCards3);

              setDoneCards((prev) => [...prev, graduatedCard]);
              updateCardsEvery(graduatedCard);

              setProgress((prev) => {
                const newVal = { ...prev };
                newVal[type] += 1;
                newVal.todo -= 1; // Card is done
                return newVal;
              });
              return; // Exit early
            } else {
              updatedFirst = {
                ...baseFirst,
                due: new Date(now2.getTime() + 1000 * 60 * 10),
                state: 1,
                consecutiveGood: newConsecutiveGood,
              };
            }
            break;
          case "hard":
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            updatedFirst = {
              ...baseFirst,
              due: new Date(now2.getTime() + 1000 * 60 * 5),
              state: 0,
              consecutiveGood: newConsecutiveGood,
            };
            updatedPrevAns = type;
            break;
          case "wrong":
            newConsecutiveGood = 0; // Reset licznika przy złej odpowiedzi
            updatedFirst = {
              ...baseFirst,
              due: new Date(now2.getTime() + 1000 * 60),
              state: 0,
              consecutiveGood: newConsecutiveGood,
            };
            updatedPrevAns = type;
            break;
          default:
            break;
        }
        const updatedCard2 = {
          ...currentCard2,
          firstLearn: updatedFirst,
          seenInSession: true,
          prevAns: updatedPrevAns,
        } as any;
        let nextCards2 = [updatedCard2, ...cards.slice(1)];
        nextCards2 = nextCards2.sort(compDueDate);
        setCards(nextCards2);
        updateCardsEvery(updatedCard2);
        setProgress((prev) => {
          const prevAns = currentCard2.prevAns;
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
      cards.forEach((card: any) => {
        console.log(card);
      });
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

      // Get deck details first
      const { deck: currentDeck } = await cloudFunctions.getDeckDetails(id);
      const { settings } = await cloudFunctions.getUserSettings(userCtx.id!);
      const dailyGoal = settings.dailyGoal ?? 10; // liczba dziennych powtórek (FSRS)
      const dailyNew = settings.dailyNew ?? 20; // liczba nowych kart do wprowadzenia

      if (currentDeck) {
        setDeck(currentDeck);

        // Normalize timestamps (can be Firestore Timestamp, {seconds,_seconds}, number or Date)
        const toMillis = (v: any): number | undefined => {
          if (!v) return undefined;
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            const t = Date.parse(v);
            return isNaN(t) ? undefined : t;
          }
          if (v.seconds !== undefined && v.nanoseconds !== undefined) {
            return v.seconds * 1000 + Math.floor(v.nanoseconds / 1e6);
          }
          if (v._seconds !== undefined && v._nanoseconds !== undefined) {
            return v._seconds * 1000 + Math.floor(v._nanoseconds / 1e6);
          }
          try {
            const d = new Date(v);
            const t = d.getTime();
            return isNaN(t) ? undefined : t;
          } catch {
            return undefined;
          }
        };

        // Server-side: fetch due FSRS + due firstLearn + new candidates
        const [dueRes, newRes] = await Promise.all([
          cloudFunctions.getDueDeckCards(id, dailyGoal * 3 + dailyNew * 3),
          cloudFunctions.getNewDeckCards(id, dailyNew * 3),
        ]);
        const cards = [...(dueRes.cards || []), ...(newRes.cards || [])];

        // Prepare FSRS base card for safe defaults
        const baseAlgo = {
          difficulty: 2.5,
          stability: 0,
          reps: 0,
          lapses: 0,
          scheduled_days: 0,
          elapsed_days: 0,
          last_review: Date.now(),
          state: 0,
          due: Date.now(),
        };

        // Transform ALL fetched cards first (we'll partition after)
        const transformedCardsAll = (cards || []).map((card: any) => {
          const algo = card.cardAlgo || {};
          const first = card.firstLearn;
          const dueTs = first?.isNew
            ? first?.due
              ? new Date(first.due).getTime()
              : Date.now()
            : toMillis(algo.due) ??
              (card.nextReviewDate
                ? new Date(card.nextReviewDate).getTime()
                : Date.now());
          const lastReviewTs =
            toMillis(algo.last_review) ??
            (card.lastReviewDate
              ? new Date(card.lastReviewDate).getTime()
              : baseAlgo.last_review);

          const fullAlgo = {
            difficulty:
              algo.difficulty ?? card.difficulty ?? baseAlgo.difficulty,
            stability: algo.stability ?? card.stability ?? baseAlgo.stability,
            reps: algo.reps ?? card.reps ?? baseAlgo.reps,
            lapses: algo.lapses ?? card.lapses ?? baseAlgo.lapses,
            scheduled_days:
              algo.scheduled_days ??
              card.scheduled_days ??
              baseAlgo.scheduled_days,
            elapsed_days:
              algo.elapsed_days ?? card.elapsed_days ?? baseAlgo.elapsed_days,
            last_review: lastReviewTs,
            state:
              typeof algo.state === "number"
                ? algo.state
                : typeof card.state === "number"
                ? card.state
                : baseAlgo.state,
            due: dueTs,
          };

          const isNew =
            fullAlgo.reps === 0 || fullAlgo.state === 0 || !card.lastReviewDate;

          // Get firstLearn from card if it exists, otherwise initialize
          const firstLearn = card.firstLearn || {
            isNew,
            state: fullAlgo.state,
            consecutiveGood: 0, // Inicjalizujemy licznik dobrych odpowiedzi pod rząd
          };

          return {
            id: card.id,
            cardData: card.cardData || card, // keep original content
            firstLearn: firstLearn,
            cardAlgo: fullAlgo,
            grade: card.grade ?? 0,
            difficulty: fullAlgo.difficulty,
            interval: card.nextReviewInterval ?? fullAlgo.scheduled_days ?? 1,
          };
        });

        const nowMs = Date.now();
        // Partition into FSRS due, firstLearn due (already introduced), and brand new introductions
        const fsrsDue = transformedCardsAll.filter(
          (c: any) =>
            !c.firstLearn?.isNew &&
            (c.cardAlgo?.due ? new Date(c.cardAlgo.due).getTime() : 0) <= nowMs
        );

        const firstLearnDue = transformedCardsAll.filter(
          (c: any) =>
            c.firstLearn?.isNew &&
            c.firstLearn?.due &&
            new Date(c.firstLearn.due).getTime() <= nowMs
        );

        const newCandidates = transformedCardsAll.filter(
          (c: any) =>
            c.firstLearn?.isNew &&
            (!c.firstLearn?.due ||
              new Date(c.firstLearn.due).getTime() <= nowMs) &&
            (c.consecutiveGood ?? c.firstLearn?.consecutiveGood ?? 0) === 0 &&
            c.prevAns == null
        );

        const introductions = newCandidates.slice(0, dailyNew);

        // Merge and deduplicate
        const mapById: Record<string, any> = {};
        [...fsrsDue, ...firstLearnDue, ...introductions].forEach((c: any) => {
          mapById[c.id] = c;
        });
        const sessionCards = Object.values(mapById) as any[];

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
        console.log(
          "Fetched cards for deck:",
          id,
          "Session cards count:",
          sortedSession.length
        );
      }
    } catch (e) {
      console.log("Error fetching cards:", e);
      setError("Failed to fetch cards");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateCards(doneCards: DoneCard[]): Promise<void> {
    try {
      if (userCtx.id && doneCards.length > 0) {
        // Update each card's progress using cloud function
        await Promise.all(
          doneCards.map((doneCard) =>
            cloudFunctions.updateCardProgress(
              userCtx.id!,
              id, // deck id
              doneCard.id,
              doneCard.grade || 0,
              doneCard.difficulty || 2.5,
              doneCard.interval || 1,
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
    if (tooltip.shown) {
      if (time) {
        clearTimeout(time);
      }
      const newTime = setTimeout(() => {
        setTooltip((prev) => {
          const newVal = { ...prev };
          newVal.shown = false;
          return newVal;
        });
      }, 2000);
      setTime(newTime);
    } else {
      setTime(undefined);
    }
  }, [tooltip]);

  // Effect to handle progress changes and navigation
  useEffect(() => {
    const tabBarValue = ((progress.all - progress.todo) * 100) / progress.all;
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

  return {
    cardLogicState,
    error,
    setCards,
    setIsBack,
    setTooltip,
    setProgress,
    newCard,
    updateCards,
    clearError: () => setError(null),
  };
}
