import type { Card } from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";

export interface UpdateProgressInput {
  userId: string;
  deckId: string;
  card: Card;
  scheduledTime: number;
  direction?: "forward" | "reverse";
  dailyStats?: unknown;
}

export interface UndoCardInput {
  userId: string;
  deckId: string;
  card: Card;
  previousCard: Card;
}

/**
 * Business logic for updateCardProgress and undoCard.
 * Depends only on repository interfaces — no Firebase imports.
 * Populated in Phase 3.
 */
export class CardProgressService {
  constructor(
    protected readonly cardRepo: CardRepository,
    protected readonly userRepo: UserRepository,
    protected readonly statsRepo: StatsRepository
  ) {}

  async updateProgress(input: UpdateProgressInput): Promise<void> {
    void input;
    throw new Error("Not implemented — Phase 3");
  }

  async undoCard(input: UndoCardInput): Promise<void> {
    void input;
    throw new Error("Not implemented — Phase 3");
  }

  /**
   * Pure function: compute the updated Card after a review.
   * Applies scheduledTime to the correct algo fields based on direction
   * (forward → firstLearn/cardAlgo, reverse → firstLearnReverse/cardAlgoReverse).
   * No I/O — fully unit-testable without mocks.
   */
  _computeUpdatedCard(
    card: Card,
    scheduledTime: number,
    direction: "forward" | "reverse"
  ): Card {
    void card;
    void scheduledTime;
    void direction;
    throw new Error("Not implemented — Phase 3");
  }
}
