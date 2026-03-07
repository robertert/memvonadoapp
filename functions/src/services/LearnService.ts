import type { Card, DailyStats, DeckLearningData } from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";

export type SessionItem = { card: Card; direction: "forward" | "reverse" };

export interface StartSessionResult {
  items: SessionItem[];
  dailyStats: DailyStats;
  deck: DeckLearningData;
}

export interface ApplyDailyLimitParams {
  newCards: Card[];
  dueCards: Card[];
  todayStats: DailyStats | null;
  itemLimit: number;
  bidirectional: boolean;
}

export interface ApplyDailyLimitResult {
  /** New cards after applying the daily item-limit cap */
  newCardsStripped: Card[];
  /** Initialised daily stats (either from todayStats or freshly computed) */
  currentStats: DailyStats;
}

/**
 * Business logic for startLearningSession.
 * Depends only on repository interfaces — no Firebase imports.
 * Populated in Phase 3.
 */
export class LearnService {
  constructor(
    protected readonly cardRepo: CardRepository,
    protected readonly deckRepo: DeckRepository,
    protected readonly userRepo: UserRepository,
    protected readonly statsRepo: StatsRepository
  ) {}

  async startSession(input: {
    userId: string;
    deckId: string;
  }): Promise<StartSessionResult> {
    void input;
    throw new Error("Not implemented — Phase 3");
  }

  /**
   * Pure function: clips newCards to the remaining daily item slots.
   * No I/O — fully unit-testable without mocks.
   */
  _applyDailyLimit(params: ApplyDailyLimitParams): ApplyDailyLimitResult {
    void params;
    throw new Error("Not implemented — Phase 3");
  }

  /**
   * Pure function: interleaves forward and reverse SessionItem arrays so that
   * one forward item alternates with one reverse item.
   * No I/O — fully unit-testable without mocks.
   */
  _interleaveItems(
    forward: SessionItem[],
    reverse: SessionItem[]
  ): SessionItem[] {
    void forward;
    void reverse;
    throw new Error("Not implemented — Phase 3");
  }
}
