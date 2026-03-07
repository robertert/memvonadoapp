import type { Card } from "memvocado-types";

/** Options for fetching new cards */
export interface GetNewCardsOptions {
  /** Maximum number of new cards to return */
  effectiveLimit: number;
  /**
   * If true: fetch without ordering (limit only, random-ish Firestore behaviour).
   * If false: order by createdAt ASC so oldest cards come first.
   */
  shuffleNewCards: boolean;
}

export interface CardRepository {
  /**
   * Fetch new (firstLearn.isNew === true) cards from a user's deck copy.
   * Respects effectiveLimit and shuffleNewCards ordering.
   */
  getNewCards(
    userId: string,
    deckId: string,
    options: GetNewCardsOptions
  ): Promise<Card[]>;

  /**
   * Fetch due forward cards:
   *   - firstLearn.isFirst === true && firstLearn.isNew === false  (learning phase)
   *   - cardAlgo.due <= end-of-day                                 (FSRS phase)
   */
  getDueCards(userId: string, deckId: string): Promise<Card[]>;

  /**
   * Fetch due reverse cards:
   *   - firstLearnReverse.isFirst === true && firstLearnReverse.isNew === false
   *   - cardAlgoReverse.due <= end-of-day
   */
  getDueReverseCards(userId: string, deckId: string): Promise<Card[]>;

  /**
   * Lazy-init cardAlgoReverse / firstLearnReverse for cards that are missing those
   * fields.  Writes defaults to Firestore via a single batch and mutates the
   * supplied card objects in-place so callers see the updated values immediately.
   */
  initReverseFields(userId: string, deckId: string, cards: Card[]): Promise<void>;

  /** Merge-write a card to Firestore */
  setCard(userId: string, deckId: string, card: Card): Promise<void>;

  /** Get a single card, or null if the document does not exist */
  getCard(userId: string, deckId: string, cardId: string): Promise<Card | null>;

  /** Get every card in a user's deck copy */
  getAllUserCards(userId: string, deckId: string): Promise<Card[]>;

  /** Get every card in a source (public) deck */
  getAllSourceCards(deckId: string): Promise<Card[]>;

  /**
   * Bulk-copy all cards from a source deck to a user's deck learning copy.
   * Cards are written with firstLearn.isNew = true.
   */
  bulkCopyCards(
    sourceDeckId: string,
    userId: string,
    userDeckId: string
  ): Promise<void>;
}
