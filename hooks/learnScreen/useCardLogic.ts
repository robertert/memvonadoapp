import { useContext, useEffect, useReducer, useState, useCallback } from "react";
import { router } from "expo-router";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { consumeEditedCard } from "../../utils/editedCardStore";
import { PLACEHOLDER_MODE } from "../../constants/flags";
import {
  placeholderCards,
  placeholderDecks,
} from "../../constants/placeholderData";
import {
  TooltipState,
  SessionItem,
} from "../../app/stack/learnScreen.types";
import { Card, CardGrade, DeckLearningData } from "@/types/schemas";
import { evaluateCardAnswer } from "../../utils/cardSchedulingHelper";
import { TOOLTIP_DURATION_MS } from "../../constants/learningConstants";
import {
  sessionReducer,
  initialSessionState,
} from "../../reducers/sessionReducer";
import { useStreakTracking } from "./useStreakTracking";

export function useCardLogic(id: string) {
  const userCtx = useContext(UserContext);
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [isBack, setIsBack] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ shown: false });
  const streak = useStreakTracking();

  // Initial fetch
  useEffect(() => {
    fetchCards();
  }, []);

  // Routing effect — fires when session finishes
  useEffect(() => {
    if (state.status !== "finished") return;
    const isEmpty = state.progress.all === 0;
    router.replace({
      pathname: "./victoryScreen",
      params: isEmpty
        ? { empty: "true" }
        : {
            completedNewToday: state.dailyStats?.completedNewToday,
            completedDueToday: state.dailyStats?.completedDueToday,
            empty: "false",
            finished: "true",
          },
    });
  }, [state.status]);

  // Tooltip auto-dismiss
  useEffect(() => {
    if (!tooltip.shown) return;
    const timerId = setTimeout(
      () => setTooltip((prev) => ({ ...prev, shown: false })),
      TOOLTIP_DURATION_MS
    );
    return () => clearTimeout(timerId);
  }, [tooltip.shown]);

  async function fetchCards(): Promise<void> {
    dispatch({ type: "START_SESSION" });
    try {
      if (PLACEHOLDER_MODE) {
        const placeholderDeck = placeholderDecks[0];
        const deckData = {
          id: placeholderDeck.id,
          title: placeholderDeck.title,
          cardsNum: placeholderDeck.cardsNum,
          settings: { zenMode: false, shuffleNewCards: false },
        } as DeckLearningData;

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

        dispatch({
          type: "START_SESSION_SUCCESS",
          payload: { cards: transformedItems, dailyStats: null, deck: deckData },
        });
        return;
      }

      const { items, dailyStats, deck } =
        await cloudFunctions.startLearningSession(id);

      const sessionItems: SessionItem[] = items.map((item) => ({
        card: item.card,
        direction: item.direction as "forward" | "reverse",
      }));

      dispatch({
        type: "START_SESSION_SUCCESS",
        payload: { cards: sessionItems, dailyStats, deck },
      });
    } catch (e) {
      console.log("Error fetching cards:", e);
      dispatch({ type: "SET_ERROR", payload: "Failed to fetch cards" });
    }
  }

  function handleCardAnswer(grade: CardGrade): void {
    if (state.cards.length === 0) return;
    const currentItem = state.cards[0];

    streak.handleAnswer(grade);
    const result = evaluateCardAnswer(currentItem, grade, state.dailyStats);
    dispatch({ type: "ANSWER_CARD", payload: { grade, ...result } });
    setIsBack(false);

    // Fire-and-forget API update
    void (async () => {
      try {
        if (userCtx.id && currentItem.card.id) {
          await cloudFunctions.updateCardProgress(
            userCtx.id,
            id,
            structuredClone(result.updatedItem.card),
            result.scheduledTimeDelta,
            result.newStats ?? undefined,
            currentItem.direction
          );
        }
      } catch (e) {
        console.log("Error updating card progress:", e);
      }
    })();
  }

  function goBackInHistory(): void {
    const lastEntry = state.history[state.history.length - 1];
    if (!lastEntry) return;

    dispatch({ type: "UNDO_CARD" });

    void (async () => {
      try {
        if (!lastEntry.dailyStats) {
          throw new Error("Daily stats are not defined");
        }
        await cloudFunctions.undoCard(
          id,
          structuredClone(lastEntry.item.card),
          lastEntry.dailyStats
        );
      } catch (error) {
        console.error("Error undoing card:", error);
      }
    })();
  }

  const applyEditedCard = useCallback(() => {
    const edited = consumeEditedCard();
    if (!edited) return;
    dispatch({
      type: "UPDATE_EDITED_CARD",
      payload: {
        cardId: edited.cardId,
        front: edited.front,
        back: edited.back,
        tags: edited.tags,
      },
    });
  }, []);

  // Compat shim — learnScreen.tsx expects string | null
  const lastAnswerType =
    state.lastGrade !== null ? state.lastGrade.toString() : null;
  const clearLastAnswerType = () => dispatch({ type: "CLEAR_LAST_GRADE" });

  return {
    cardLogicState: {
      cards: state.status === "loading" ? undefined : state.cards,
      isLoading: state.status === "loading",
      isBack,
      tooltip,
      deck: state.deck,
      progress: state.progress,
      dailyStats: state.dailyStats,
    },
    error: state.error,
    setIsBack,
    goBackInHistory,
    history: state.history,
    setTooltip,
    newCard: handleCardAnswer,
    clearError: () => dispatch({ type: "CLEAR_ERROR" }),
    lastAnswerType,
    clearLastAnswerType,
    currentStreak: streak.currentStreak,
    streakAchieved: streak.streakAchieved,
    clearStreakAchieved: streak.clearStreakAchieved,
    streakLost: streak.streakLost,
    applyEditedCard,
  };
}
