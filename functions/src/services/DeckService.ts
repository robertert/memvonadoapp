import {
  DeckLearningDataSchema,
  CardSchema,
  CardGrade,
  type DeckLearningData,
  type DeckSettings,
} from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";

/**
 * Business logic for deck management: copyDeck, sync, reset.
 * Depends only on repository interfaces — no Firebase imports.
 */
export class DeckService {
  /**
   * @param {DeckRepository} deckRepo - Deck repository
   * @param {CardRepository} cardRepo - Card repository
   */
  constructor(
    protected readonly deckRepo: DeckRepository,
    protected readonly cardRepo: CardRepository
  ) {}

  /**
   * Copy a source deck into a user's learning collection.
   * Creates the DeckLearningData document and bulk-copies all cards.
   * @param {string} userId - User ID
   * @param {string} deckId - Source deck ID
   * @return {Promise<DeckLearningData>} Created or existing user deck
   */
  async copyDeck(userId: string, deckId: string): Promise<DeckLearningData> {
    const srcDeck = await this.deckRepo.getSourceDeck(deckId);
    if (!srcDeck) throw new Error("Deck not found");
    if (srcDeck.is_deleted === true) throw new Error("Deck has been deleted");

    const existing = await this.deckRepo.getUserDeck(userId, deckId);
    if (existing) return existing;

    const userDeckData = DeckLearningDataSchema.parse({
      id: deckId,
      title: srcDeck.title,
      cardsNum: srcDeck.cardsNum,
      settings: { zenMode: false, shuffleNewCards: false } as DeckSettings,
      updatedAt: srcDeck.updatedAt,
      category: srcDeck.category,
      icon: srcDeck.icon,
      tags: srcDeck.tags,
      frontLanguage: srcDeck.frontLanguage ?? null,
      backLanguage: srcDeck.backLanguage ?? null,
    });

    await this.deckRepo.createUserDeck(userId, deckId, userDeckData);
    await this.cardRepo.bulkCopyCards(deckId, userId, deckId);

    return userDeckData;
  }

  /**
   * Sync card changes from a source deck to a user's learning copy.
   * Adds new cards and updates existing card content.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async syncDeck(userId: string, deckId: string): Promise<void> {
    const [sourceCards, userCards, srcDeck] = await Promise.all([
      this.cardRepo.getAllSourceCards(deckId),
      this.cardRepo.getAllUserCards(userId, deckId),
      this.deckRepo.getSourceDeck(deckId),
    ]);

    if (!srcDeck) throw new Error("Source deck not found");

    const sourceMap = new Map(sourceCards.map((c) => [c.id, c]));
    const userCardIds = new Set(userCards.map((c) => c.id));
    const now = new Date();

    for (const userCard of userCards) {
      const src = sourceMap.get(userCard.id);
      if (!src) continue;
      await this.cardRepo.setCard(userId, deckId, {
        ...userCard,
        cardData: {
          front: src.cardData.front || "",
          back: src.cardData.back || "",
        },
        tags: src.tags ?? [],
      });
    }

    for (const [cardId, src] of sourceMap) {
      if (userCardIds.has(cardId)) continue;
      const newCard = CardSchema.parse({
        ...src,
        id: cardId,
        cardData: {
          front: src.cardData.front || "",
          back: src.cardData.back || "",
        },
        tags: src.tags ?? [],
        createdAt: src.createdAt || now,
        firstLearn: { isNew: true, due: now },
        grade: CardGrade.NotGraded,
      });
      await this.cardRepo.setCard(userId, deckId, newCard);
    }

    await this.deckRepo.updateUserDeck(userId, deckId, {
      cardsNum: sourceMap.size,
      updatedAt: srcDeck.updatedAt || now,
    });
  }

  /**
   * Reset all learning progress for a user's deck.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async resetDeck(userId: string, deckId: string): Promise<void> {
    const userCards = await this.cardRepo.getAllUserCards(userId, deckId);

    for (const card of userCards) {
      const resetCard = CardSchema.parse({
        id: card.id,
        cardData: card.cardData,
        tags: card.tags,
        createdAt: card.createdAt,
        firstLearn: { isNew: true },
      });
      await this.cardRepo.setCard(userId, deckId, resetCard);
    }

    await this.deckRepo.updateUserDeck(userId, deckId, { dailyStats: null });
  }
}
