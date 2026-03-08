import {
  CardSchema,
  StudySessionCreateSchema,
  CardGrade,
  type Card,
  type CardAlgo,
  type DailyStats,
} from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";

export interface UpdateProgressInput {
  userId: string;
  deckId: string;
  card: Card;
  scheduledTime: number;
  direction?: "forward" | "reverse";
  dailyStats?: DailyStats;
}

export interface UndoCardInput {
  userId: string;
  deckId: string;
  card: Card;
  previousCard: Card;
  dailyStats?: DailyStats;
}

const DEFAULT_CARD_ALGO: CardAlgo = {
  difficulty: 2.5,
  scheduled_days: 1,
  due: new Date(),
  reps: 0,
  state: 0,
  stability: 0,
  elapsed_days: 0,
  lapses: 0,
};

/**
 * Business logic for updateCardProgress and undoCard.
 * Depends only on repository interfaces — no Firebase imports.
 */
export class CardProgressService {
  /**
   * @param {CardRepository} cardRepo - Card repository
   * @param {UserRepository} userRepo - User repository
   * @param {StatsRepository} statsRepo - Stats repository
   */
  constructor(
    protected readonly cardRepo: CardRepository,
    protected readonly userRepo: UserRepository,
    protected readonly statsRepo: StatsRepository
  ) {}

  /**
   * @param {UpdateProgressInput} input - Progress update input
   * @return {Promise<void>}
   */
  async updateProgress(input: UpdateProgressInput): Promise<void> {
    const { userId, deckId, card, scheduledTime, direction, dailyStats } =
      input;

    const updated = this._computeUpdatedCard(
      card,
      scheduledTime,
      direction ?? "forward"
    );
    await this.cardRepo.setCard(userId, deckId, updated);

    const session = StudySessionCreateSchema.parse({
      deckId,
      cardId: card.id,
      grade: card.grade ?? CardGrade.NotGraded,
      reviewTime: new Date(),
    });
    await this.userRepo.addStudySession(userId, session);

    if (dailyStats) {
      const previousStats = await this.statsRepo.getDeckDailyStats(
        userId,
        deckId
      );
      await this.statsRepo.updateDailyStats(
        userId,
        deckId,
        dailyStats,
        previousStats
      );
    }

    await this.userRepo.incrementField(userId, "stats.totalReviews", 1);
  }

  /**
   * @param {UndoCardInput} input - Undo card input
   * @return {Promise<void>}
   */
  async undoCard(input: UndoCardInput): Promise<void> {
    const { userId, deckId, card, previousCard, dailyStats } = input;

    await this.cardRepo.setCard(userId, deckId, previousCard);

    if (dailyStats) {
      const previousStats = await this.statsRepo.getDeckDailyStats(
        userId,
        deckId
      );
      await this.statsRepo.updateDailyStats(
        userId,
        deckId,
        dailyStats,
        previousStats
      );
    }

    await this.userRepo.deleteLatestStudySession(userId, card.id);
  }

  /**
   * Pure function: compute the updated Card after a review.
   * Applies scheduledTime to the correct algo fields based on direction
   * (forward → firstLearn/cardAlgo, reverse → firstLearnReverse/cardAlgoReverse).
   * No I/O — fully unit-testable without mocks.
   * @param {Card} card - Current card state
   * @param {number} scheduledTime - Milliseconds until next review
   * @param {"forward" | "reverse"} direction - Review direction
   * @return {Card} Updated card
   */
  _computeUpdatedCard(
    card: Card,
    scheduledTime: number,
    direction: "forward" | "reverse"
  ): Card {
    const now = Date.now();
    let cardUpdateData: Card;

    if (direction === "reverse") {
      if (card.firstLearnReverse?.isFirst) {
        cardUpdateData = CardSchema.parse({
          ...card,
          firstLearnReverse: {
            ...card.firstLearnReverse,
            due: new Date(now + scheduledTime),
          },
        });
      } else {
        cardUpdateData = CardSchema.parse({
          ...card,
          cardAlgoReverse: {
            ...(card.cardAlgoReverse ?? DEFAULT_CARD_ALGO),
            due: new Date(now + scheduledTime),
          },
        });
      }
    } else {
      if (card.firstLearn?.isFirst) {
        cardUpdateData = CardSchema.parse({
          ...card,
          firstLearn: {
            ...card.firstLearn,
            due: new Date(now + scheduledTime),
          },
        });
      } else {
        cardUpdateData = CardSchema.parse({
          ...card,
          cardAlgo: {
            ...(card.cardAlgo ?? DEFAULT_CARD_ALGO),
            due: new Date(now + scheduledTime),
          },
        });
      }
    }

    return cardUpdateData;
  }
}
