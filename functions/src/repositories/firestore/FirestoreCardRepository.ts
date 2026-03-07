import type { Card } from "memvocado-types";
import type {
  CardRepository,
  GetNewCardsOptions,
} from "../interfaces/CardRepository";

/**
 * Firestore-backed implementation of CardRepository.
 * Methods are populated in Phase 2 (extract Local functions).
 */
export class FirestoreCardRepository implements CardRepository {
  async getNewCards(
    _userId: string,
    _deckId: string,
    _options: GetNewCardsOptions
  ): Promise<Card[]> {
    throw new Error("Not implemented — Phase 2");
  }

  async getDueCards(_userId: string, _deckId: string): Promise<Card[]> {
    throw new Error("Not implemented — Phase 2");
  }

  async getDueReverseCards(_userId: string, _deckId: string): Promise<Card[]> {
    throw new Error("Not implemented — Phase 2");
  }

  async initReverseFields(
    _userId: string,
    _deckId: string,
    _cards: Card[]
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async setCard(_userId: string, _deckId: string, _card: Card): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }

  async getCard(
    _userId: string,
    _deckId: string,
    _cardId: string
  ): Promise<Card | null> {
    throw new Error("Not implemented — Phase 2");
  }

  async getAllUserCards(_userId: string, _deckId: string): Promise<Card[]> {
    throw new Error("Not implemented — Phase 2");
  }

  async getAllSourceCards(_deckId: string): Promise<Card[]> {
    throw new Error("Not implemented — Phase 2");
  }

  async bulkCopyCards(
    _sourceDeckId: string,
    _userId: string,
    _userDeckId: string
  ): Promise<void> {
    throw new Error("Not implemented — Phase 2");
  }
}
