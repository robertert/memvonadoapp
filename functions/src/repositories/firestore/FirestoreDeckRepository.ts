import type { Deck, DeckLearningData } from "memvocado-types";
import type { DeckRepository } from "../interfaces/DeckRepository";

/**
 * Firestore-backed implementation of DeckRepository.
 * Methods are populated in Phase 2 (extract Local functions).
 */
export class FirestoreDeckRepository implements DeckRepository {
  async getUserDeck(
    _userId: string,
    _deckId: string
  ): Promise<DeckLearningData | null> {
    throw new Error("Not implemented — Phase 2");
  }

  async createUserDeck(
    _userId: string,
    _deckId: string,
    _data: DeckLearningData
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async updateUserDeck(
    _userId: string,
    _deckId: string,
    _data: Record<string, unknown>
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async getSourceDeck(_deckId: string): Promise<Deck | null> {
    throw new Error("Not implemented — Phase 2");
  }

  async updateDeck(
    _deckId: string,
    _data: Record<string, unknown>
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async getLearnerIds(_deckId: string): Promise<string[]> {
    throw new Error("Not implemented — Phase 2");
  }
}
