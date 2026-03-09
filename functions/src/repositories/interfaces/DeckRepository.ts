import type { Deck, DeckLearningData } from "memvocado-types";

export interface DeckRepository {
  /** Get a user's learning copy of a deck, or null if not started yet */
  getUserDeck(userId: string, deckId: string): Promise<DeckLearningData | null>;

  /** Create (set) a user's learning copy of a deck */
  createUserDeck(
    userId: string,
    deckId: string,
    data: DeckLearningData
  ): Promise<void>;

  /**
   * Partial update of a user's deck learning data.
   * Supports dot-notation keys (e.g. "dailyStats.newCardsRemaining").
   */
  updateUserDeck(
    userId: string,
    deckId: string,
    data: Record<string, unknown>
  ): Promise<void>;

  /** Get a source (public) deck by ID, or null if it does not exist */
  getSourceDeck(deckId: string): Promise<Deck | null>;

  /**
   * Partial update of a source deck document.
   * Supports dot-notation keys.
   */
  updateDeck(deckId: string, data: Record<string, unknown>): Promise<void>;

  /** Get the IDs of every user who has a learning copy of this deck */
  getLearnerIds(deckId: string): Promise<string[]>;

  /** Get top N public decks ordered by views descending */
  getPopularDecks(limit: number): Promise<Deck[]>;
}
