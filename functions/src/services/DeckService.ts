import type { DeckLearningData } from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";

/**
 * Business logic for deck management: copyDeck, sync, reset.
 * Populated in Phase 3.
 */
export class DeckService {
  constructor(
    protected readonly deckRepo: DeckRepository,
    protected readonly cardRepo: CardRepository
  ) {}

  /**
   * Copy a source deck into a user's learning collection.
   * Creates the DeckLearningData document and bulk-copies all cards.
   */
  async copyDeck(userId: string, deckId: string): Promise<DeckLearningData> {
    void userId;
    void deckId;
    throw new Error("Not implemented — Phase 3");
  }

  /** Sync card changes from a source deck to a user's learning copy */
  async syncDeck(userId: string, deckId: string): Promise<void> {
    void userId;
    void deckId;
    throw new Error("Not implemented — Phase 3");
  }

  /** Reset all learning progress for a user's deck */
  async resetDeck(userId: string, deckId: string): Promise<void> {
    void userId;
    void deckId;
    throw new Error("Not implemented — Phase 3");
  }
}
