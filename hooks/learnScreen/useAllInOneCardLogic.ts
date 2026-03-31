import { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { useAuth } from "../../store/auth";
import { cloudFunctions } from "../../services/cloudFunctions";
import { consumeEditedCard } from "../../utils/editedCardStore";
import {
  AllInOneSession,
  AllInOneCard,
  getSession,
  saveSession,
  clearSession,
  getNextCard,
} from "../../utils/allInOneProgress";
import type { Card, DeckLearningData } from "@/types/schemas";
import { playSound } from "@/utils/soundTrigger";

export interface AllInOneSessionStats {
  completed: number;
  total: number;
  wrongAttempts: number;
}

export interface AllInOneCardLogicState {
  currentCard: AllInOneCard | null;
  isLoading: boolean;
  isBack: boolean;
  isFinished: boolean;
  progress: number;
  totalCardsInDeck: number;
  sessionStats: AllInOneSessionStats;
  canUndo: boolean;
}

/**
 * Custom hook for managing All in One learning mode logic
 * @param deckId - The deck ID for learning
 */
export function useAllInOneCardLogic(deckId: string) {
  const { userId } = useAuth();

  const [session, setSession] = useState<AllInOneSession | null>(null);
  const [currentCard, setCurrentCard] = useState<AllInOneCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBack, setIsBack] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [deck, setDeck] = useState<DeckLearningData | null>(null);

  // Pagination — no cursor state needed; index into session.shuffledCardIds manages pages

  // Undo history
  const [history, setHistory] = useState<
    {
      card: AllInOneCard;
      wasCompleted: boolean;
      previousWrongCount: number;
      previousLastWrongAt: number | null;
    }[]
  >([]);

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Advance to the next card in the session
   */
  const advanceToNextCard = useCallback((currentSession: AllInOneSession) => {
    const nextCard = getNextCard(currentSession);
    setCurrentCard(nextCard);
    setIsBack(false);
    cloudFunctions.updateCardProgressAllInOne(true);
    // Check if session is complete
    if (!nextCard) {
      const remainingIncomplete = currentSession.cards.filter(
        (c) => !c.isCompleted
      );
      if (remainingIncomplete.length === 0) {
        setIsFinished(true);
      }
    }
  }, []);

  /**
   * Fetch the next batch of cards using the stored shuffled ID order
   */
  const fetchMoreCards = useCallback(async (): Promise<void> => {
    if (!session) return;
    const { shuffledCardIds, cardFetchIndex } = session;
    if (cardFetchIndex >= shuffledCardIds.length) return;

    try {
      const nextIds = shuffledCardIds.slice(cardFetchIndex, cardFetchIndex + 100);
      const { cards } = await cloudFunctions.getCardsByIds(deckId, nextIds);

      const bidirectional = deck?.settings?.bidirectional ?? false;
      const newCards: AllInOneCard[] = cards.flatMap((card: Card) => {
        const forward: AllInOneCard = {
          cardId: card.id,
          front: card.cardData.front,
          back: card.cardData.back,
          direction: "forward",
          wrongCount: 0,
          lastWrongAt: null,
          isCompleted: false,
        };
        if (!bidirectional) return [forward];
        const reverse: AllInOneCard = {
          cardId: card.id,
          front: card.cardData.back,
          back: card.cardData.front,
          direction: "reverse",
          wrongCount: 0,
          lastWrongAt: null,
          isCompleted: false,
        };
        return [forward, reverse];
      });

      const updatedSession: AllInOneSession = {
        ...session,
        cards: [...session.cards, ...newCards],
        cardFetchIndex: cardFetchIndex + nextIds.length,
      };

      setSession(updatedSession);
      await saveSession(updatedSession);
    } catch (err) {
      console.error("Error fetching more cards:", err);
    }
  }, [session, deckId, deck]);

  /**
   * Initialize or resume the learning session
   */
  async function initSession(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      // Get deck data for total card count
      const { deck: deckData } = await cloudFunctions.getUserDeckDetails(deckId);
      setDeck(deckData);
      setTotalCardsInDeck(deckData?.cardsNum ?? 0);

      let existingSession = await getSession(deckId);

      // Clear legacy sessions that predate shuffledCardIds/cardFetchIndex fields
      if (existingSession && !existingSession.shuffledCardIds) {
        await clearSession(deckId);
        existingSession = null;
      }

      if (!existingSession) {
        // Start a new session — backend shuffles all card IDs and returns first 100 cards
        const { shuffledCardIds, cards } = await cloudFunctions.startAIOSession(deckId);

        if (shuffledCardIds.length === 0) {
          setIsFinished(true);
          setIsLoading(false);
          return;
        }

        const bidirectional = deckData?.settings?.bidirectional ?? false;

        const sessionCards: AllInOneCard[] = cards.flatMap((card) => {
          const forward: AllInOneCard = {
            cardId: card.id,
            front: card.cardData.front,
            back: card.cardData.back,
            direction: "forward",
            wrongCount: 0,
            lastWrongAt: null,
            isCompleted: false,
          };
          if (!bidirectional) return [forward];
          const reverse: AllInOneCard = {
            cardId: card.id,
            front: card.cardData.back,
            back: card.cardData.front,
            direction: "reverse",
            wrongCount: 0,
            lastWrongAt: null,
            isCompleted: false,
          };
          return [forward, reverse];
        });

        existingSession = {
          deckId,
          cards: sessionCards,
          startedAt: Date.now(),
          completedCards: 0,
          totalCards: bidirectional
            ? (deckData?.cardsNum ?? shuffledCardIds.length) * 2
            : (deckData?.cardsNum ?? shuffledCardIds.length),
          wrongAttempts: 0,
          shuffledCardIds,
          cardFetchIndex: cards.length,
        };

        await saveSession(existingSession);
      }

      setSession(existingSession);
      advanceToNextCard(existingSession);
    } catch (err) {
      console.error("Error initializing All in One session:", err);
      setError("Failed to start learning session");
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Respond to the current card (correct or wrong)
   */
  async function respondToCard(isCorrect: boolean): Promise<void> {
    if (!session || !currentCard) return;

    if (isCorrect) {
      playSound("good");
    } else {
      playSound("wrong");
    }

    // Save state for undo
    setHistory((prev) => [
      ...prev,
      {
        card: { ...currentCard },
        wasCompleted: currentCard.isCompleted,
        previousWrongCount: currentCard.wrongCount,
        previousLastWrongAt: currentCard.lastWrongAt,
      },
    ]);

    let updatedSession: AllInOneSession;

    const matchesCurrentCard = (c: AllInOneCard) =>
      c.cardId === currentCard.cardId && c.direction === currentCard.direction;

    if (isCorrect) {
      // Mark card as completed
      updatedSession = {
        ...session,
        cards: session.cards.map((c) =>
          matchesCurrentCard(c) ? { ...c, isCompleted: true } : c
        ),
        completedCards: session.completedCards + 1,
      };
    } else {
      // Mark card as wrong with cooldown
      updatedSession = {
        ...session,
        cards: session.cards.map((c) =>
          matchesCurrentCard(c)
            ? {
                ...c,
                wrongCount: c.wrongCount + 1,
                lastWrongAt: Date.now(),
              }
            : c
        ),
        wrongAttempts: session.wrongAttempts + 1,
      };
    }

    setSession(updatedSession);
    await saveSession(updatedSession);

    // Check if we need more cards
    const remainingIncomplete = updatedSession.cards.filter(
      (c) => !c.isCompleted
    );
    const hasMoreToFetch = updatedSession.cardFetchIndex < updatedSession.shuffledCardIds.length;
    if (remainingIncomplete.length < 10 && hasMoreToFetch) {
      await fetchMoreCards();
    }

    // Check if session complete
    if (
      updatedSession.completedCards === updatedSession.totalCards &&
      !hasMoreToFetch
    ) {
      setIsFinished(true);
      await clearSession(deckId); // Auto-clear on completion
    } else {
      advanceToNextCard(updatedSession);
    }
  }

  /**
   * Undo the last card action
   */
  async function undoLastCard(): Promise<void> {
    if (history.length === 0 || !session) return;

    const lastEntry = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    // Restore card state
    const restoredCard: AllInOneCard = {
      ...lastEntry.card,
      isCompleted: lastEntry.wasCompleted,
      wrongCount: lastEntry.previousWrongCount,
      lastWrongAt: lastEntry.previousLastWrongAt,
    };

    // Recalculate completed count
    const updatedCards = session.cards.map((c) =>
      c.cardId === restoredCard.cardId && c.direction === restoredCard.direction
        ? restoredCard
        : c
    );
    const completedCount = updatedCards.filter((c) => c.isCompleted).length;

    // Recalculate wrong attempts (if the last action was a wrong answer, decrement)
    let wrongAttempts = session.wrongAttempts;
    if (lastEntry.previousWrongCount < restoredCard.wrongCount) {
      // This was a wrong answer that was undone
    } else if (
      !lastEntry.wasCompleted &&
      session.cards.find((c) => c.cardId === restoredCard.cardId)?.isCompleted
    ) {
      // Card was marked complete, now undone
    }

    const updatedSession: AllInOneSession = {
      ...session,
      cards: updatedCards,
      completedCards: completedCount,
      // Note: wrongAttempts might be tricky to restore accurately
    };

    cloudFunctions.updateCardProgressAllInOne(false);
    setSession(updatedSession);
    setCurrentCard(restoredCard);
    setIsBack(false);
    setIsFinished(false);
    await saveSession(updatedSession);
  }

  /**
   * Get session statistics
   */
  const sessionStats: AllInOneSessionStats = {
    completed: session?.completedCards ?? 0,
    total: totalCardsInDeck,
    wrongAttempts: session?.wrongAttempts ?? 0,
  };

  /**
   * Checks if a card was edited and updates local state accordingly.
   * Called when the screen regains focus after returning from the edit screen.
   */
  const applyEditedCard = useCallback(() => {
    const edited = consumeEditedCard();
    if (!edited) return;

    // Update current card if it matches
    setCurrentCard((prev) => {
      if (!prev || prev.cardId !== edited.cardId) return prev;
      // Swap front/back correctly depending on direction
      return prev.direction === "reverse"
        ? { ...prev, front: edited.back, back: edited.front }
        : { ...prev, front: edited.front, back: edited.back };
    });

    // Update session cards (both forward and reverse items for this cardId)
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.cardId !== edited.cardId) return c;
          return c.direction === "reverse"
            ? { ...c, front: edited.back, back: edited.front }
            : { ...c, front: edited.front, back: edited.back };
        }),
      };
    });
  }, []);

  // Initialize session on mount
  useEffect(() => {
    initSession();
  }, [deckId]);

  // Navigate to victory screen when finished
  useEffect(() => {
    if (isFinished && session) {
      clearSession(deckId); // ensure session is always cleared on completion
      router.replace({
        pathname: "./victoryScreen",
        params: {
          mode: "all_in_one",
          totalCards: sessionStats.completed.toString(),
          wrongAttempts: sessionStats.wrongAttempts.toString(),
        },
      });
    }
  }, [isFinished, session]);

  return {
    currentCard,
    session,
    deck,
    isLoading,
    isBack,
    setIsBack,
    respondToCard,
    undoLastCard,
    canUndo: history.length > 0,
    isFinished,
    progress: totalCardsInDeck > 0 ? (session?.completedCards ?? 0) / totalCardsInDeck : 0,
    totalCardsInDeck,
    sessionStats,
    error,
    clearError: () => setError(null),
    applyEditedCard,
  };
}
