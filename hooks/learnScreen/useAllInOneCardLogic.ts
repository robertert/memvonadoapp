import { useContext, useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { UserContext } from "../../store/user-context";
import { cloudFunctions } from "../../services/cloudFunctions";
import { consumeEditedCard } from "../../utils/editedCardStore";
import {
  AllInOneSession,
  AllInOneCard,
  getSession,
  saveSession,
  clearSession,
  getNextCard,
  shuffleArray,
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
  const userCtx = useContext(UserContext);

  const [session, setSession] = useState<AllInOneSession | null>(null);
  const [currentCard, setCurrentCard] = useState<AllInOneCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBack, setIsBack] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [totalCardsInDeck, setTotalCardsInDeck] = useState<number>(0);
  const [deck, setDeck] = useState<DeckLearningData | null>(null);

  // Pagination state
  const [hasMoreCards, setHasMoreCards] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

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
   * Fetch more cards when needed (pagination)
   */
  const fetchMoreCards = useCallback(async (): Promise<void> => {
    if (!hasMoreCards || !nextCursor || !session) return;

    try {
      const { cards, hasMore, lastDocId } =
        await cloudFunctions.getUserDeckCards(deckId, 100, nextCursor);

      const newCards: AllInOneCard[] = cards.map((card: Card) => ({
        cardId: card.id,
        front: card.cardData.front,
        back: card.cardData.back,
        wrongCount: 0,
        lastWrongAt: null,
        isCompleted: false,
      }));

      const updatedSession: AllInOneSession = {
        ...session,
        cards: [...session.cards, ...shuffleArray(newCards)],
      };

      setSession(updatedSession);
      setHasMoreCards(hasMore);
      setNextCursor(lastDocId);
      await saveSession(updatedSession);
    } catch (err) {
      console.error("Error fetching more cards:", err);
    }
  }, [hasMoreCards, nextCursor, session, deckId]);

  /**
   * Initialize or resume the learning session
   */
  async function initSession(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      // Get deck data for total card count
      const { deck: deckData } = await cloudFunctions.getUserDeckDetails(
        deckId
      );
      setDeck(deckData);
      setTotalCardsInDeck(deckData?.cardsNum ?? 0);

      let existingSession = await getSession(deckId);


      if (!existingSession) {
        // Fetch cards with pagination (100 at a time)
        const { cards, hasMore, lastDocId } =
          await cloudFunctions.getUserDeckCards(deckId, 100);

        if (cards.length === 0) {
          // No cards in deck
          setIsFinished(true);
          setIsLoading(false);
          return;
        }

        // Shuffle cards for new session
        const shuffledCards = shuffleArray(cards);

        existingSession = {
          deckId,
          cards: shuffledCards.map((card: Card) => ({
            cardId: card.id,
            front: card.cardData.front,
            back: card.cardData.back,
            wrongCount: 0,
            lastWrongAt: null,
            isCompleted: false,
          })),
          startedAt: Date.now(),
          completedCards: 0,
          totalCards: deckData?.cardsNum ?? cards.length,
          wrongAttempts: 0,
        };

        

        setHasMoreCards(hasMore);
        setNextCursor(lastDocId);
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

    if (isCorrect) {
      // Mark card as completed
      updatedSession = {
        ...session,
        cards: session.cards.map((c) =>
          c.cardId === currentCard.cardId ? { ...c, isCompleted: true } : c
        ),
        completedCards: session.completedCards + 1,
      };
    } else {
      // Mark card as wrong with cooldown
      updatedSession = {
        ...session,
        cards: session.cards.map((c) =>
          c.cardId === currentCard.cardId
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
    if (remainingIncomplete.length < 10 && hasMoreCards) {
      await fetchMoreCards();
    }

    // Check if session complete
    if (
      updatedSession.completedCards === updatedSession.totalCards &&
      !hasMoreCards
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
      c.cardId === restoredCard.cardId ? restoredCard : c
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
      return { ...prev, front: edited.front, back: edited.back };
    });

    // Update session cards
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: prev.cards.map((c) =>
          c.cardId === edited.cardId
            ? { ...c, front: edited.front, back: edited.back }
            : c
        ),
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
