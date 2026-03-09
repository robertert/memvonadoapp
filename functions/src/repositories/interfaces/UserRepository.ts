import type {
  User,
  StudySessionCreate,
  DeckLearningData,
  UserSettings,
  NotificationCreate,
  SearchLog,
} from "memvocado-types";

export interface UserRepository {
  /** Get a user document, or null if it does not exist */
  getUser(userId: string): Promise<User | null>;

  /** Create a new user document (set, not update) */
  createUser(userId: string, user: User): Promise<void>;

  /**
   * Partial update of a user document.
   * Supports dot-notation keys (e.g. "stats.totalReviews").
   */
  updateUser(userId: string, data: Record<string, unknown>): Promise<void>;

  /** Atomically increment a numeric field using FieldValue.increment */
  incrementField(userId: string, field: string, amount: number): Promise<void>;

  /** Append a study session sub-document and return its new document ID */
  addStudySession(userId: string, session: StudySessionCreate): Promise<string>;

  /**
   * Delete the most recently written study session for this user and card.
   * Used by undoCard to roll back the last review.
   * No-op if there are no matching study sessions.
   */
  deleteLatestStudySession(userId: string, cardId: string): Promise<void>;

  /** Check if a username is already taken (case-sensitive exact match) */
  isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean>;

  /** List all learning decks for a user */
  listUserDecks(userId: string): Promise<DeckLearningData[]>;

  /** Get user settings (tries settings/app sub-doc first, falls back to user.settings) */
  getUserSettings(userId: string): Promise<UserSettings>;

  /** Save user settings to users/{userId}/settings/app */
  setUserSettings(userId: string, settings: UserSettings): Promise<void>;

  /** Get user stats and recent study sessions */
  getUserProgress(userId: string): Promise<{
    stats: Record<string, unknown>;
    recentSessions: unknown[];
    dailyGoal?: number;
  }>;

  /**
   * If dailyStats.lastUpdatedStats is from a previous day, archive them to
   * historyDailyStats and reset dailyStats counters.
   * Returns the archived date string (YYYY-MM-DD) or null if nothing was archived.
   */
  archiveDailyStatsIfNeeded(
    userId: string,
    dailyStats: {
      completedNewToday?: number;
      completedDueToday?: number;
      lastUpdatedStats?: unknown;
    } | null | undefined,
    timeZone: string
  ): Promise<string | null>;

  /** Increment stats.totalReviews and dailyStats.completedNewToday by +1 or -1 */
  incrementAllInOneStats(userId: string, amount: 1 | -1): Promise<void>;

  /**
   * Query historyDailyStats where date >= startYmd.
   * Returns a map of { [ymd]: totalCards }.
   */
  getActivityHeatmap(
    userId: string,
    startYmd: string
  ): Promise<Record<string, number>>;

  /** List all awards ordered by earnedAt desc */
  getUserAwards(userId: string): Promise<Array<Record<string, unknown>>>;

  /** Check whether callerId follows targetUserId */
  isFollowing(callerId: string, targetUserId: string): Promise<boolean>;

  /** Toggle follow/unfollow and return the new state */
  toggleFollow(
    callerId: string,
    targetUserId: string
  ): Promise<{ isFollowing: boolean }>;

  /** Find userId by exact (normalized) username, or null if not found */
  findByUsername(username: string): Promise<string | null>;

  /** Return true if userId has a document at admin/roles/admins/{userId} */
  isAdmin(userId: string): Promise<boolean>;

  /** Read streakThreshold from admin/settings (default 50) */
  getStreakThreshold(): Promise<number>;

  /** Write a notification document to users/{targetUserId}/notifications and return its ID */
  writeNotification(targetUserId: string, notification: NotificationCreate): Promise<string>;

  /** Append a search log to users/{userId}/searchLogs */
  addSearchLog(userId: string, log: Omit<SearchLog, "id">): Promise<void>;

  /** Get search logs for a user, ordered by timestamp desc */
  getSearchLogs(userId: string): Promise<SearchLog[]>;
}
