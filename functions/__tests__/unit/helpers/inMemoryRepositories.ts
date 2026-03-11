import type {
  Card,
  DailyStats,
  Deck,
  DeckLearningData,
  Following,
  GetCurrentSeasonResponse,
  LeagueGroup,
  Notification,
  NotificationCreate,
  SeasonUserPoints,
  StudySessionCreate,
  User,
  UserSettings,
} from "memvocado-types";
import type {
  CardRepository,
  GetNewCardsOptions,
} from "../../../src/repositories/interfaces/CardRepository";
import type { DeckRepository } from "../../../src/repositories/interfaces/DeckRepository";
import type { UserRepository } from "../../../src/repositories/interfaces/UserRepository";
import type { StatsRepository } from "../../../src/repositories/interfaces/StatsRepository";
import type { LeagueRepository } from "../../../src/repositories/interfaces/LeagueRepository";
import type {
  GroupMember,
  RankingRepository,
} from "../../../src/repositories/interfaces/RankingRepository";
import type { NotificationRepository } from "../../../src/repositories/interfaces/NotificationRepository";
import type {
  AvocadoRepository,
  AvocadoUserData,
} from "../../../src/repositories/interfaces/AvocadoRepository";
import type { UsageRepository } from "../../../src/repositories/interfaces/UsageRepository";
import type { SeasonRepository } from "../../../src/repositories/interfaces/SeasonRepository";

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyDotNotationUpdate(
  obj: Record<string, unknown>,
  data: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(data)) {
    const parts = key.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] == null || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
}

// ── InMemoryCardRepository ────────────────────────────────────────────────────

export class InMemoryCardRepository implements CardRepository {
  private cards = new Map<string, Card[]>(); // key: `${userId}/${deckId}`
  private sourceCards = new Map<string, Card[]>(); // key: deckId

  seed(userId: string, deckId: string, cards: Card[]): void {
    this.cards.set(`${userId}/${deckId}`, [...cards]);
  }

  seedSourceCards(deckId: string, cards: Card[]): void {
    this.sourceCards.set(deckId, [...cards]);
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
    userId: string,
    deckId: string,
    cardId: string
  ): Promise<Card | null> {
    const cards = this.cards.get(`${userId}/${deckId}`) ?? [];
    return cards.find((c) => c.id === cardId) ?? null;
  }

  async getAllUserCards(userId: string, deckId: string): Promise<Card[]> {
    return this.cards.get(`${userId}/${deckId}`) ?? [];
  }

  async getAllSourceCards(deckId: string): Promise<Card[]> {
    return this.sourceCards.get(deckId) ?? [];
  }

  async bulkCopyCards(
    _sourceDeckId: string,
    _userId: string,
    _userDeckId: string
  ): Promise<void> {}

  async bulkResetCards(_userId: string, _deckId: string): Promise<void> {}

  async bulkSyncUserCards(
    _userId: string,
    _deckId: string,
    _ops: {
      upsert: Card[];
      update: Array<{ id: string; cardData: { front: string; back: string }; tags: string[] }>;
      delete: string[];
    },
    _deckUpdate: Record<string, unknown>
  ): Promise<void> {}

  async applySourceCardChanges(
    _deckId: string,
    _changes: {
      created: Array<{ cardData: { front: string; back: string }; tags?: string[] }>;
      updated: Array<{ id: string; cardData: { front: string; back: string }; tags?: string[] }>;
      deleted: string[];
    }
  ): Promise<void> {}

  async updateSourceCard(
    _deckId: string,
    _cardId: string,
    _data: { cardData: { front: string; back: string }; tags: string[] }
  ): Promise<void> {}

  async updateUserCardIfExists(
    _userId: string,
    _deckId: string,
    _cardId: string,
    _data: { cardData: { front: string; back: string }; tags: string[] }
  ): Promise<void> {}

  async getSourceDeckCardsPaginated(
    _deckId: string,
    _limit: number,
    _startAfterId?: string
  ): Promise<{ cards: Card[]; hasMore: boolean; lastDocId: string | null }> {
    return { cards: [], hasMore: false, lastDocId: null };
  }

  async getUserDeckCardsPaginated(
    _userId: string,
    _deckId: string,
    _limit: number,
    _startAfterId?: string
  ): Promise<{ cards: Card[]; hasMore: boolean; lastDocId: string | null }> {
    return { cards: [], hasMore: false, lastDocId: null };
  }
}

// ── InMemoryDeckRepository ────────────────────────────────────────────────────

export class InMemoryDeckRepository implements DeckRepository {
  private userDecks = new Map<string, DeckLearningData>(); // key: `${userId}/${deckId}`
  private sourceDecks = new Map<string, Deck>(); // key: deckId
  private learnerIds = new Map<string, string[]>(); // key: deckId
  private likedBy = new Set<string>(); // `${userId}/${deckId}`
  private notifiedLikers = new Set<string>(); // `${deckId}/${userId}`

  // Call counters for assertions
  createUserDeckCallCount = 0;
  addEditorCallCount = 0;
  removeEditorCallCount = 0;
  softDeleteCallCount = 0;

  seed(userId: string, deckId: string, deck: DeckLearningData): void {
    this.userDecks.set(`${userId}/${deckId}`, deck);
  }

  seedSourceDeck(deckId: string, deck: Deck): void {
    this.sourceDecks.set(deckId, deck);
  }

  seedLearnerIds(deckId: string, ids: string[]): void {
    this.learnerIds.set(deckId, ids);
  }

  async getUserDeck(userId: string, deckId: string): Promise<DeckLearningData | null> {
    return this.userDecks.get(`${userId}/${deckId}`) ?? null;
  }

  async createUserDeck(userId: string, deckId: string, data: DeckLearningData): Promise<void> {
    this.createUserDeckCallCount++;
    this.userDecks.set(`${userId}/${deckId}`, data);
  }

  async updateUserDeck(
    userId: string,
    deckId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const deck = this.userDecks.get(`${userId}/${deckId}`);
    if (deck) {
      applyDotNotationUpdate(deck as unknown as Record<string, unknown>, data);
    }
  }

  async getSourceDeck(deckId: string): Promise<Deck | null> {
    return this.sourceDecks.get(deckId) ?? null;
  }

  async updateDeck(deckId: string, data: Record<string, unknown>): Promise<void> {
    const deck = this.sourceDecks.get(deckId);
    if (deck) {
      this.sourceDecks.set(deckId, { ...deck, ...data } as Deck);
    }
  }

  async getLearnerIds(deckId: string): Promise<string[]> {
    return this.learnerIds.get(deckId) ?? [];
  }

  async getPopularDecks(_limit: number): Promise<Deck[]> {
    return [];
  }

  async createSourceDeck(deck: Deck): Promise<string> {
    const id = `deck-src-${Date.now()}`;
    this.sourceDecks.set(id, { ...deck, id });
    return id;
  }

  async bulkCreateSourceCards(
    _deckId: string,
    _cards: Array<{ cardData: { front: string; back: string }; tags?: string[] }>
  ): Promise<string[]> {
    return [];
  }

  async syncUserCopiesMetadata(
    _deckId: string,
    _updateData: Record<string, unknown>
  ): Promise<void> {}

  async softDeleteDeck(deckId: string): Promise<void> {
    this.softDeleteCallCount++;
    const deck = this.sourceDecks.get(deckId);
    if (deck) {
      this.sourceDecks.set(deckId, { ...deck, is_deleted: true });
    }
  }

  async recordView(_deckId: string, _userId: string): Promise<void> {}

  async toggleLike(
    userId: string,
    deckId: string
  ): Promise<{
    liked: boolean;
    newLikeCount: number;
    deckCreatorId: string | null;
    deckTitle: string | null;
  }> {
    const key = `${userId}/${deckId}`;
    const deck = this.sourceDecks.get(deckId);
    const liked = !this.likedBy.has(key);
    if (liked) {
      this.likedBy.add(key);
    } else {
      this.likedBy.delete(key);
    }
    return {
      liked,
      newLikeCount: this.likedBy.size,
      deckCreatorId: deck?.createdBy ?? null,
      deckTitle: deck?.title ?? null,
    };
  }

  async hasBeenNotifiedLiker(deckId: string, userId: string): Promise<boolean> {
    return this.notifiedLikers.has(`${deckId}/${userId}`);
  }

  async markLikerNotified(deckId: string, userId: string): Promise<void> {
    this.notifiedLikers.add(`${deckId}/${userId}`);
  }

  async addSourceCard(
    _deckId: string,
    _cardData: { front: string; back: string },
    _tags?: string[]
  ): Promise<string> {
    return `card-${Date.now()}`;
  }

  async addUserCard(
    _userId: string,
    _deckId: string,
    _cardData: { front: string; back: string },
    _tags?: string[]
  ): Promise<string> {
    return `card-${Date.now()}`;
  }

  async addEditor(deckId: string, editorId: string): Promise<void> {
    this.addEditorCallCount++;
    const deck = this.sourceDecks.get(deckId);
    if (deck) {
      const editors = [...(deck.editors ?? [])];
      if (!editors.includes(editorId)) editors.push(editorId);
      this.sourceDecks.set(deckId, { ...deck, editors });
    }
  }

  async removeEditor(deckId: string, editorId: string): Promise<void> {
    this.removeEditorCallCount++;
    const deck = this.sourceDecks.get(deckId);
    if (deck) {
      const editors = (deck.editors ?? []).filter((e) => e !== editorId);
      this.sourceDecks.set(deckId, { ...deck, editors });
    }
  }

  async isLikedByUser(userId: string, deckId: string): Promise<boolean> {
    return this.likedBy.has(`${userId}/${deckId}`);
  }

  async searchDecks(_query: string, _filters?: unknown, _limit?: number): Promise<Deck[]> {
    return [];
  }
}

// ── InMemoryUserRepository ────────────────────────────────────────────────────

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  private userDecks = new Map<string, DeckLearningData[]>(); // key: userId
  private adminSet = new Set<string>();
  private streakThreshold = 10;
  private followingMap = new Map<string, Set<string>>(); // callerId → Set<targetUserId>
  notifications: Array<{ targetUserId: string; notification: NotificationCreate }> = [];

  seed(userId: string, user: User): void {
    this.users.set(userId, user);
  }

  seedDecks(userId: string, decks: DeckLearningData[]): void {
    this.userDecks.set(userId, decks);
  }

  setAdmin(userId: string): void {
    this.adminSet.add(userId);
  }

  setStreakThreshold(threshold: number): void {
    this.streakThreshold = threshold;
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async createUser(userId: string, user: User): Promise<void> {
    this.users.set(userId, user);
  }

  async updateUser(userId: string, data: Record<string, unknown>): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      applyDotNotationUpdate(user as unknown as Record<string, unknown>, data);
    }
  }

  async incrementField(
    userId: string,
    field: string,
    amount: number
  ): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const parts = field.split(".");
      let current = user as unknown as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] == null || typeof current[part] !== "object") {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      const last = parts[parts.length - 1];
      current[last] = ((current[last] as number) ?? 0) + amount;
    }
  }

  async addStudySession(
    _userId: string,
    _session: StudySessionCreate
  ): Promise<string> {
    return "session-id";
  }

  async deleteLatestStudySession(_userId: string, _cardId: string): Promise<void> {}

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    for (const [uid, user] of this.users) {
      if (uid === excludeUserId) continue;
      if (user.username === username) return true;
    }
    return false;
  }

  async listUserDecks(userId: string): Promise<DeckLearningData[]> {
    return this.userDecks.get(userId) ?? [];
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const user = this.users.get(userId);
    return (user?.settings ?? {
      theme: "light",
      notificationsEnabled: true,
      dailyGoal: 10,
      language: "en",
      timeZone: "UTC",
    }) as UserSettings;
  }

  async setUserSettings(_userId: string, _settings: UserSettings): Promise<void> {}

  async getUserProgress(_userId: string): Promise<{
    stats: Record<string, unknown>;
    recentSessions: unknown[];
    dailyGoal?: number;
  }> {
    return { stats: {}, recentSessions: [] };
  }

  async archiveDailyStatsIfNeeded(
    _userId: string,
    _dailyStats: unknown,
    _timeZone: string
  ): Promise<string | null> {
    return null;
  }

  async incrementAllInOneStats(_userId: string, _amount: 1 | -1): Promise<void> {}

  async getActivityHeatmap(
    _userId: string,
    _startYmd: string
  ): Promise<Record<string, number>> {
    return {};
  }

  async getUserAwards(_userId: string): Promise<Array<Record<string, unknown>>> {
    return [];
  }

  async isFollowing(callerId: string, targetUserId: string): Promise<boolean> {
    return this.followingMap.get(callerId)?.has(targetUserId) ?? false;
  }

  async toggleFollow(
    callerId: string,
    targetUserId: string
  ): Promise<{ isFollowing: boolean }> {
    const following = this.followingMap.get(callerId) ?? new Set<string>();
    const isFollowing = !following.has(targetUserId);
    if (isFollowing) {
      following.add(targetUserId);
    } else {
      following.delete(targetUserId);
    }
    this.followingMap.set(callerId, following);
    return { isFollowing };
  }

  async findByUsername(username: string): Promise<string | null> {
    for (const [uid, user] of this.users) {
      if (user.username === username) return uid;
    }
    return null;
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.adminSet.has(userId);
  }

  async getStreakThreshold(): Promise<number> {
    return this.streakThreshold;
  }

  async writeNotification(
    targetUserId: string,
    notification: NotificationCreate
  ): Promise<string> {
    this.notifications.push({ targetUserId, notification });
    return `notif-${Date.now()}`;
  }

  async addSearchLog(_userId: string, _log: unknown): Promise<void> {}

  async getSearchLogs(_userId: string): Promise<[]> {
    return [];
  }
}

// ── InMemoryStatsRepository ───────────────────────────────────────────────────

export class InMemoryStatsRepository implements StatsRepository {
  private stats = new Map<string, DailyStats>();

  seed(userId: string, deckId: string, stats: DailyStats): void {
    this.stats.set(`${userId}/${deckId}`, stats);
  }

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

// ── InMemoryLeagueRepository ──────────────────────────────────────────────────

export class InMemoryLeagueRepository implements LeagueRepository {
  private currentSeasonId = "season-1";
  private seasonPoints = new Map<string, SeasonUserPoints>(); // `${seasonId}/${userId}`
  private users = new Map<string, User>();
  private groups = new Map<string, LeagueGroup>(); // `${seasonId}/${league}/${groupId}`
  private nextGroupId = "group-new-1";

  seedSeasonId(id: string): void {
    this.currentSeasonId = id;
  }

  seedUser(userId: string, user: User): void {
    this.users.set(userId, user);
  }

  seedSeasonPoints(seasonId: string, userId: string, points: SeasonUserPoints): void {
    this.seasonPoints.set(`${seasonId}/${userId}`, points);
  }

  seedGroup(seasonId: string, league: number, groupId: string, group: LeagueGroup): void {
    this.groups.set(`${seasonId}/${league}/${groupId}`, group);
  }

  setNextGroupId(id: string): void {
    this.nextGroupId = id;
  }

  async getCurrentSeasonId(seasonId?: string): Promise<string> {
    return seasonId ?? this.currentSeasonId;
  }

  async getUserSeasonPoints(
    seasonId: string,
    userId: string
  ): Promise<SeasonUserPoints | null> {
    return this.seasonPoints.get(`${seasonId}/${userId}`) ?? null;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async getGroupById(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<LeagueGroup | null> {
    return this.groups.get(`${seasonId}/${leagueNumber}/${groupId}`) ?? null;
  }

  async removeUserFromGroup(
    seasonId: string,
    _leagueNumber: number,
    _groupId: string,
    userId: string
  ): Promise<void> {
    const key = `${seasonId}/${userId}`;
    const pts = this.seasonPoints.get(key);
    if (pts) {
      this.seasonPoints.set(key, { ...pts, groupId: undefined });
    }
  }

  async updateUserLeagueDoc(userId: string, league: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, league });
    }
  }

  async updateUserSeasonPoints(
    seasonId: string,
    userId: string,
    data: Partial<SeasonUserPoints>
  ): Promise<void> {
    const key = `${seasonId}/${userId}`;
    const existing = this.seasonPoints.get(key) ?? ({} as SeasonUserPoints);
    this.seasonPoints.set(key, { ...existing, ...data });
  }

  async assignUserToGroup(_params: {
    seasonId: string;
    leagueNumber: number;
    userId: string;
    points: number;
  }): Promise<string> {
    return this.nextGroupId;
  }
}

// ── InMemoryRankingRepository ─────────────────────────────────────────────────

export class InMemoryRankingRepository implements RankingRepository {
  private currentSeasonId = "season-1";
  private seasonPoints = new Map<string, SeasonUserPoints>(); // `${seasonId}/${userId}`
  private groups = new Map<string, GroupMember[]>(); // `${seasonId}/${league}/${groupId}`
  private following = new Map<string, Following[]>(); // userId → Following[]
  private users = new Map<string, User>();
  private nextGroupId = "group-assigned-1";

  seedSeasonId(id: string): void {
    this.currentSeasonId = id;
  }

  seedSeasonPoints(seasonId: string, userId: string, points: SeasonUserPoints): void {
    this.seasonPoints.set(`${seasonId}/${userId}`, points);
  }

  seedGroupMembers(seasonId: string, league: number, groupId: string, members: GroupMember[]): void {
    this.groups.set(`${seasonId}/${league}/${groupId}`, members);
  }

  seedFollowing(userId: string, following: Following[]): void {
    this.following.set(userId, following);
  }

  seedUser(userId: string, user: User): void {
    this.users.set(userId, user);
  }

  setNextGroupId(id: string): void {
    this.nextGroupId = id;
  }

  async getCurrentSeasonId(seasonId?: string): Promise<string> {
    return seasonId ?? this.currentSeasonId;
  }

  async getUserSeasonPoints(
    seasonId: string,
    userId: string
  ): Promise<SeasonUserPoints | null> {
    return this.seasonPoints.get(`${seasonId}/${userId}`) ?? null;
  }

  async getGroupMembers(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<GroupMember[]> {
    return this.groups.get(`${seasonId}/${leagueNumber}/${groupId}`) ?? [];
  }

  async getGroupSize(
    seasonId: string,
    leagueNumber: number,
    groupId: string
  ): Promise<number> {
    return (this.groups.get(`${seasonId}/${leagueNumber}/${groupId}`) ?? []).length;
  }

  async getFollowing(userId: string): Promise<Following[]> {
    return this.following.get(userId) ?? [];
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) ?? null;
  }

  async assignUserToGroup(_params: {
    seasonId: string;
    leagueNumber: number;
    userId: string;
    points: number;
  }): Promise<string> {
    return this.nextGroupId;
  }
}

// ── InMemoryNotificationRepository ───────────────────────────────────────────

export class InMemoryNotificationRepository implements NotificationRepository {
  private notifications = new Map<string, Notification[]>(); // key: userId
  createCallCount = 0;
  markReadCallCount = 0;
  lastCreatedUserId: string | null = null;
  lastCreatedNotification: Omit<import("memvocado-types").NotificationCreate, "createdAt" | "readAt"> | null = null;

  seed(userId: string, notifications: Notification[]): void {
    this.notifications.set(userId, [...notifications]);
  }

  async getUnread(userId: string, limit = 50): Promise<Notification[]> {
    return (this.notifications.get(userId) ?? [])
      .filter((n) => !n.read)
      .slice(0, limit);
  }

  async create(
    userId: string,
    notification: Omit<import("memvocado-types").NotificationCreate, "createdAt" | "readAt">
  ): Promise<string> {
    this.createCallCount++;
    this.lastCreatedUserId = userId;
    this.lastCreatedNotification = notification;
    const id = `notif-${Date.now()}-${this.createCallCount}`;
    const existing = this.notifications.get(userId) ?? [];
    this.notifications.set(userId, [...existing, {
      ...notification,
      id,
      createdAt: new Date(),
      read: notification.read ?? false,
    } as Notification]);
    return id;
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    this.markReadCallCount++;
    const notifications = this.notifications.get(userId);
    if (notifications) {
      const updated = notifications.map((n) =>
        n.id === notifId ? { ...n, read: true, readAt: new Date() } : n
      );
      this.notifications.set(userId, updated);
    }
  }
}

// ── InMemoryUsageRepository ───────────────────────────────────────────────────

export class InMemoryUsageRepository implements UsageRepository {
  private data = new Map<string, number>(); // key: `${userId}/${date}`
  private adminLimits = new Map<string, number>(); // key: limit key

  seed(userId: string, date: string, count: number): void {
    this.data.set(`${userId}/${date}`, count);
  }

  setAdminLimit(key: string, value: number): void {
    this.adminLimits.set(key, value);
  }

  async getUsage(userId: string, date: string): Promise<number> {
    return this.data.get(`${userId}/${date}`) ?? 0;
  }

  async incrementUsage(userId: string, date: string): Promise<number> {
    const key = `${userId}/${date}`;
    const current = this.data.get(key) ?? 0;
    const newCount = current + 1;
    this.data.set(key, newCount);
    return newCount;
  }

  async getAdminLimit(key: string): Promise<number> {
    return this.adminLimits.get(key) ?? 0;
  }
}

// ── InMemorySeasonRepository ──────────────────────────────────────────────────

export class InMemorySeasonRepository implements SeasonRepository {
  private currentSeason: GetCurrentSeasonResponse | null = null;
  private nextSeasonId = "season-next-1";
  private userPoints = new Map<string, SeasonUserPoints>(); // key: `${seasonId}/${userId}`
  snapshotsPublished: string[] = [];

  seed(season: GetCurrentSeasonResponse): void {
    this.currentSeason = season;
  }

  setNextSeasonId(id: string): void {
    this.nextSeasonId = id;
  }

  seedUserPoints(seasonId: string, userId: string, points: SeasonUserPoints): void {
    this.userPoints.set(`${seasonId}/${userId}`, points);
  }

  async getCurrentSeason(): Promise<GetCurrentSeasonResponse | null> {
    return this.currentSeason;
  }

  async getOrInitializeSeason(): Promise<GetCurrentSeasonResponse> {
    if (this.currentSeason) return this.currentSeason;
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.currentSeason = {
      seasonId: "season-auto-1",
      startAt: now,
      endAt: end,
      status: "active",
    };
    return this.currentSeason;
  }

  async getUserSeasonPoints(seasonId: string, userId: string): Promise<SeasonUserPoints | null> {
    return this.userPoints.get(`${seasonId}/${userId}`) ?? null;
  }

  async submitPoints(params: {
    userId: string;
    delta: number;
    seasonId: string;
    userLeague: number;
  }): Promise<void> {
    const key = `${params.seasonId}/${params.userId}`;
    const existing = this.userPoints.get(key);
    this.userPoints.set(key, {
      points: (existing?.points ?? 0) + params.delta,
      league: existing?.league ?? params.userLeague,
      groupId: existing?.groupId,
      lastActivityAt: new Date(),
    });
  }

  async publishLeaderboardSnapshot(seasonId: string): Promise<void> {
    this.snapshotsPublished.push(seasonId);
  }

  async rollOverSeason(_currentSeasonId: string, _currentEndAt: Date): Promise<string> {
    const newId = this.nextSeasonId;
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.currentSeason = { seasonId: newId, startAt: now, endAt: end, status: "active" };
    return newId;
  }
}

// ── InMemoryAvocadoRepository ─────────────────────────────────────────────────

export class InMemoryAvocadoRepository implements AvocadoRepository {
  private users = new Map<string, AvocadoUserData>();
  private config: import("memvocado-types").AvocadoConfig | null = null;
  private streakThreshold = 10;
  updateCallCount = 0;
  lastUpdateData: Record<string, unknown> | null = null;

  seed(userId: string, data: AvocadoUserData): void {
    this.users.set(userId, data);
  }

  seedConfig(config: import("memvocado-types").AvocadoConfig): void {
    this.config = config;
  }

  setStreakThreshold(threshold: number): void {
    this.streakThreshold = threshold;
  }

  async getUser(userId: string): Promise<AvocadoUserData | null> {
    return this.users.get(userId) ?? null;
  }

  async updateAvocadoGrowth(userId: string, data: Record<string, unknown>): Promise<void> {
    this.updateCallCount++;
    this.lastUpdateData = data;
    const userData = this.users.get(userId);
    if (userData) {
      applyDotNotationUpdate(userData as unknown as Record<string, unknown>, data);
    }
  }

  async getAvocadoConfig(): Promise<import("memvocado-types").AvocadoConfig | null> {
    return this.config;
  }

  async getStreakThreshold(): Promise<number> {
    return this.streakThreshold;
  }
}
