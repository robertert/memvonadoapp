import type { Card, DailyStats, DeckLearningData } from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";
import type { StatsRepository } from "../repositories/interfaces/StatsRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

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
 */
export class LearnService {
  /**
   * @param {CardRepository} cardRepo - Card repository
   * @param {DeckRepository} deckRepo - Deck repository
   * @param {UserRepository} userRepo - User repository
   * @param {StatsRepository} statsRepo - Stats repository
   */
  constructor(
    protected readonly cardRepo: CardRepository,
    protected readonly deckRepo: DeckRepository,
    protected readonly userRepo: UserRepository,
    protected readonly statsRepo: StatsRepository
  ) {}

  /**
   * @param {object} input - Session input
   * @return {Promise<StartSessionResult>} Session result
   */
  async startSession(input: {
    userId: string;
    deckId: string;
  }): Promise<StartSessionResult> {
    const { userId, deckId } = input;

    const deck = await this.deckRepo.getUserDeck(userId, deckId);
    if (!deck) throw new Error("Deck not found");

    const bidirectional = deck.settings.bidirectional ?? false;

    const [dueCards, newCards] = await Promise.all([
      this.cardRepo.getDueCards(userId, deckId),
      this.cardRepo.getNewCards(userId, deckId, {
        effectiveLimit: 9999,
        shuffleNewCards: deck.settings.shuffleNewCards ?? false,
      }),
    ]);

    const userData = await this.userRepo.getUser(userId);
    const timeZone = userData?.settings?.timeZone ?? "UTC";

    const todayStats = await this._getOrResetStats(userId, deckId, timeZone);

    const itemLimit =
      deck.settings.newCardsNumPerDay ??
      userData?.settings?.dailyNew ??
      50;

    const { newCardsStripped, currentStats } = this._applyDailyLimit({
      newCards,
      dueCards,
      todayStats,
      itemLimit,
      bidirectional,
    });

    let items: SessionItem[];

    if (bidirectional) {
      await this.cardRepo.initReverseFields(userId, deckId, [
        ...newCardsStripped,
        ...dueCards,
      ]);
      const dueReverseCards = await this.cardRepo.getDueReverseCards(userId, deckId);

      if (!todayStats) {
        currentStats.dueCardsRemaining = dueCards.length + dueReverseCards.length;
      }

      const dueCardsWithNewReverse = dueCards.filter(
        (c) => c.firstLearnReverse?.isNew
      );

      const forwardDueItems: SessionItem[] = dueCards.map((card) => ({
        card,
        direction: "forward" as const,
      }));
      const forwardNewItems: SessionItem[] = newCardsStripped.map((card) => ({
        card,
        direction: "forward" as const,
      }));
      const reverseDueItems: SessionItem[] = dueReverseCards.map((card) => ({
        card,
        direction: "reverse" as const,
      }));
      const reverseNewItems: SessionItem[] = [
        ...newCardsStripped.map((card) => ({ card, direction: "reverse" as const })),
        ...dueCardsWithNewReverse.map((card) => ({ card, direction: "reverse" as const })),
      ];

      items = this._interleaveItems(
        [...forwardDueItems, ...forwardNewItems],
        [...reverseDueItems, ...reverseNewItems]
      );
    } else {
      items = [
        ...dueCards.map((card) => ({ card, direction: "forward" as const })),
        ...newCardsStripped.map((card) => ({ card, direction: "forward" as const })),
      ];
    }

    await this.statsRepo.setDeckDailyStats(userId, deckId, currentStats);
    await this.deckRepo.updateUserDeck(userId, deckId, { lastReviewDate: new Date() });

    return { items, dailyStats: currentStats, deck };
  }

  /**
   * Pure function: clips newCards to the remaining daily item slots.
   * No I/O — fully unit-testable without mocks.
   * @param {ApplyDailyLimitParams} params - Limit params
   * @return {ApplyDailyLimitResult} Clipped cards and initialised stats
   */
  _applyDailyLimit(params: ApplyDailyLimitParams): ApplyDailyLimitResult {
    const { newCards, dueCards, todayStats, itemLimit, bidirectional } = params;

    let currentStats: DailyStats;
    if (todayStats) {
      currentStats = { ...todayStats };
    } else {
      currentStats = {
        newCardsRemaining: newCards.length,
        dueCardsRemaining: dueCards.length,
        inProgressDueCards: 0,
        inProgressNewCards: 0,
        completedNewToday: 0,
        completedDueToday: 0,
        lastUpdatedStats: new Date(),
      };
    }

    const newItemsNotStarted = bidirectional ? newCards.length * 2 : newCards.length;
    const newCardsTotal =
      (currentStats.inProgressNewCards ?? 0) +
      (currentStats.completedNewToday ?? 0) +
      newItemsNotStarted;

    const remainingItemSlots = Math.max(
      0,
      itemLimit -
        (currentStats.inProgressNewCards ?? 0) -
        (currentStats.completedNewToday ?? 0)
    );
    const newCardSlots = bidirectional
      ? Math.floor(remainingItemSlots / 2)
      : remainingItemSlots;

    const newCardsStripped =
      newCardsTotal > itemLimit ? newCards.slice(0, newCardSlots) : newCards;

    currentStats.newCardsRemaining = bidirectional
      ? newCardsStripped.length * 2
      : newCardsStripped.length;

    return { newCardsStripped, currentStats };
  }

  /**
   * Pure function: interleaves forward and reverse SessionItem arrays so that
   * one forward item alternates with one reverse item.
   * No I/O — fully unit-testable without mocks.
   * @param {SessionItem[]} forward - Forward items
   * @param {SessionItem[]} reverse - Reverse items
   * @return {SessionItem[]} Interleaved items
   */
  _interleaveItems(
    forward: SessionItem[],
    reverse: SessionItem[]
  ): SessionItem[] {
    const result: SessionItem[] = [];
    const maxLen = Math.max(forward.length, reverse.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < forward.length) result.push(forward[i]);
      if (i < reverse.length) result.push(reverse[i]);
    }
    return result;
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {string} timeZone - IANA timezone
   * @return {Promise<DailyStats | null>} Today's stats or null
   */
  private async _getOrResetStats(
    userId: string,
    deckId: string,
    timeZone: string
  ): Promise<DailyStats | null> {
    const dailyStats = await this.statsRepo.getDeckDailyStats(userId, deckId);
    if (!dailyStats?.lastUpdatedStats) return null;

    const todayYmd = formatYmdInTimeZone(new Date(), timeZone);
    const statsYmd = formatYmdInTimeZone(dailyStats.lastUpdatedStats, timeZone);
    return statsYmd === todayYmd ? dailyStats : null;
  }
}
