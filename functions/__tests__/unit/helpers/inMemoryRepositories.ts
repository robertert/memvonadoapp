import type {
  Card,
  DailyStats,
  DeckLearningData,
  User,
  StudySessionCreate,
  Deck,
} from "memvocado-types";
import type {
  CardRepository,
  GetNewCardsOptions,
} from "../../../src/repositories/interfaces/CardRepository";
import type { DeckRepository } from "../../../src/repositories/interfaces/DeckRepository";
import type { UserRepository } from "../../../src/repositories/interfaces/UserRepository";
import type { StatsRepository } from "../../../src/repositories/interfaces/StatsRepository";

export class InMemoryCardRepository implements CardRepository {
  private cards = new Map<string, Card[]>();

  seed(userId: string, deckId: string, cards: Card[]): void {
    this.cards.set(`${userId}/${deckId}`, [...cards]);
  }

  async getNewCards(
    userId: string,
    deckId: string,
    options: GetNewCardsOptions
  ): Promise<Card[]> {
    const { effectiveLimit } = options;
    const cards = this.cards.get(`${userId}/${deckId}`) ?? [];
    return cards.filter((c) => c.firstLearn.isNew).slice(0, effectiveLimit);
  }

  async getDueCards(userId: string, deckId: string): Promise<Card[]> {
    const cards = this.cards.get(`${userId}/${deckId}`) ?? [];
    const now = Date.now();
    const dueFirst = cards.filter(
      (c) => c.firstLearn?.isFirst && !c.firstLearn?.isNew
    );
    const dueFSRS = cards.filter(
      (c) =>
        c.cardAlgo?.due &&
        c.cardAlgo.due.getTime() <= now &&
        !c.firstLearn?.isNew
    );
    const seen = new Set<string>();
    const result: Card[] = [];
    for (const card of [...dueFirst, ...dueFSRS]) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        result.push(card);
      }
    }
    return result;
  }

  async getDueReverseCards(userId: string, deckId: string): Promise<Card[]> {
    const cards = this.cards.get(`${userId}/${deckId}`) ?? [];
    const now = Date.now();
    const dueFirst = cards.filter(
      (c) => c.firstLearnReverse?.isFirst && !c.firstLearnReverse?.isNew
    );
    const dueFSRS = cards.filter(
      (c) =>
        c.cardAlgoReverse?.due &&
        c.cardAlgoReverse.due.getTime() <= now &&
        !c.firstLearnReverse?.isNew
    );
    const seen = new Set<string>();
    const result: Card[] = [];
    for (const card of [...dueFirst, ...dueFSRS]) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        result.push(card);
      }
    }
    return result;
  }

  async initReverseFields(
    _userId: string,
    _deckId: string,
    cards: Card[]
  ): Promise<void> {
    const DEFAULT_ALGO = {
      difficulty: 2.5,
      scheduled_days: 1,
      due: new Date(),
      reps: 0,
      state: 0,
      stability: 0,
      elapsed_days: 0,
      lapses: 0,
    };
    for (const card of cards) {
      if (!card.cardAlgoReverse) card.cardAlgoReverse = { ...DEFAULT_ALGO };
      if (!card.firstLearnReverse) card.firstLearnReverse = { isNew: true };
    }
  }

  async setCard(_userId: string, _deckId: string, _card: Card): Promise<void> {}

  async getCard(
    _userId: string,
    _deckId: string,
    _cardId: string
  ): Promise<Card | null> {
    return null;
  }

  async getAllUserCards(_userId: string, _deckId: string): Promise<Card[]> {
    return [];
  }

  async getAllSourceCards(_deckId: string): Promise<Card[]> {
    return [];
  }

  async bulkCopyCards(
    _sourceDeckId: string,
    _userId: string,
    _userDeckId: string
  ): Promise<void> {}
}

export class InMemoryDeckRepository implements DeckRepository {
  private decks = new Map<string, DeckLearningData>();

  seed(userId: string, deckId: string, deck: DeckLearningData): void {
    this.decks.set(`${userId}/${deckId}`, deck);
  }

  async getUserDeck(
    userId: string,
    deckId: string
  ): Promise<DeckLearningData | null> {
    return this.decks.get(`${userId}/${deckId}`) ?? null;
  }

  async createUserDeck(
    _userId: string,
    _deckId: string,
    _data: DeckLearningData
  ): Promise<void> {}

  async updateUserDeck(
    _userId: string,
    _deckId: string,
    _data: Record<string, unknown>
  ): Promise<void> {}

  async getSourceDeck(_deckId: string): Promise<Deck | null> {
    return null;
  }

  async updateDeck(
    _deckId: string,
    _data: Record<string, unknown>
  ): Promise<void> {}

  async getLearnerIds(_deckId: string): Promise<string[]> {
    return [];
  }
}

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  seed(userId: string, user: User): void {
    this.users.set(userId, user);
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async updateUser(
    _userId: string,
    _data: Record<string, unknown>
  ): Promise<void> {}

  async incrementField(
    _userId: string,
    _field: string,
    _amount: number
  ): Promise<void> {}

  async addStudySession(
    _userId: string,
    _session: StudySessionCreate
  ): Promise<string> {
    return "";
  }

  async deleteLatestStudySession(_userId: string, _cardId: string): Promise<void> {}
}

export class InMemoryStatsRepository implements StatsRepository {
  private stats = new Map<string, DailyStats>();

  async getDeckDailyStats(
    userId: string,
    deckId: string
  ): Promise<DailyStats | null> {
    return this.stats.get(`${userId}/${deckId}`) ?? null;
  }

  async setDeckDailyStats(
    userId: string,
    deckId: string,
    stats: DailyStats
  ): Promise<void> {
    this.stats.set(`${userId}/${deckId}`, stats);
  }

  async updateDailyStats(
    userId: string,
    deckId: string,
    newStats: DailyStats,
    _previousDeckStats: DailyStats | null
  ): Promise<void> {
    this.stats.set(`${userId}/${deckId}`, newStats);
  }
}
