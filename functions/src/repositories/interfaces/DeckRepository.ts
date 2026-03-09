import type { Deck, DeckLearningData, SearchFilters } from "memvocado-types";

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

  // ── New methods added for deckHandlers refactor ──────────────────────────

  /** Create a source deck with auto-assigned ID; returns the new deck ID */
  createSourceDeck(deck: Deck): Promise<string>;

  /**
   * Bulk-create source cards inside a deck (batched in 499-op chunks).
   * Returns the generated card IDs in insertion order.
   */
  bulkCreateSourceCards(
    deckId: string,
    cards: Array<{ cardData: { front: string; back: string }; tags?: string[] }>
  ): Promise<string[]>;

  /**
   * Fan-out a metadata update to every user copy of a deck.
   * Runs a collectionGroup query then batches the updates.
   * The repo adds `updatedAt: serverTimestamp()` automatically.
   */
  syncUserCopiesMetadata(
    deckId: string,
    updateData: Record<string, unknown>
  ): Promise<void>;

  /** Soft-delete a source deck (sets is_deleted = true, deletedAt = serverTimestamp) */
  softDeleteDeck(deckId: string): Promise<void>;

  /**
   * Atomically record a unique view for userId on deckId
   * (sets decks/{deckId}/viewers/{userId} and increments views counter).
   */
  recordView(deckId: string, userId: string): Promise<void>;

  /**
   * Toggle the like state for userId on deckId inside a transaction.
   * Returns the new like state, the updated count, and the deck's creator/title
   * (needed for notification logic in the service layer).
   */
  toggleLike(
    userId: string,
    deckId: string
  ): Promise<{
    liked: boolean;
    newLikeCount: number;
    deckCreatorId: string | null;
    deckTitle: string | null;
  }>;

  /** Return true if userId has already triggered a like-notification for deckId */
  hasBeenNotifiedLiker(deckId: string, userId: string): Promise<boolean>;

  /** Mark that userId's like on deckId has been notified (so we don't notify again) */
  markLikerNotified(deckId: string, userId: string): Promise<void>;

  /**
   * Add a single card to a source deck and atomically increment its cardsNum.
   * Returns the generated card ID.
   */
  addSourceCard(
    deckId: string,
    cardData: { front: string; back: string },
    tags?: string[]
  ): Promise<string>;

  /**
   * Add a single card to a user's learning deck and atomically increment its cardsNum.
   * Returns the generated card ID.
   */
  addUserCard(
    userId: string,
    deckId: string,
    cardData: { front: string; back: string },
    tags?: string[]
  ): Promise<string>;

  /** Add an editor to a deck's editors array (arrayUnion, owner-only gate in service) */
  addEditor(deckId: string, editorId: string): Promise<void>;

  /** Remove an editor from a deck's editors array (arrayRemove) */
  removeEditor(deckId: string, editorId: string): Promise<void>;

  /** Return true if userId has liked deckId */
  isLikedByUser(userId: string, deckId: string): Promise<boolean>;

  /**
   * Search source decks by title_lower prefix + optional category/tag filters.
   * Excludes soft-deleted decks. Limit defaults to 20.
   */
  searchDecks(query: string, filters?: SearchFilters, limit?: number): Promise<Deck[]>;
}
