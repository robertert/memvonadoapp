/**
 * Mock data for Cloud Functions tests
 */

export const mockUserId = "test-user-id-123";
export const mockUserId2 = "test-user-id-456";
export const mockDeckId = "test-deck-id-123";
export const mockCardId = "test-card-id-123";
export const mockSeasonId = "2024-01-01_2024-01-08";
export const mockGroupId = "test-group-id-123";
export const mockLeagueNumber = 5;

export const mockUser = {
  id: mockUserId,
  username: "testuser",
  name: "Test User",
  email: "test@example.com",
  league: 1,
  currentGroupId: null,
  stats: {
    totalCards: 0,
    totalDecks: 0,
    totalReviews: 0,
    averageDifficulty: 0,
  },
  friends: [],
  pending: [],
  incoming: [],
  theme: "light",
};

export const mockDeck = {
  id: mockDeckId,
  title: "Test Deck",
  cardsNum: 5,
  createdBy: mockUserId,
  createdAt: new Date(),
  isPublic: false,
  views: 0,
  likes: 0,
};

export const mockCard = {
  id: mockCardId,
  front: "Test question",
  back: "Test answer",
  tags: ["test"],
  cardAlgo: {
    difficulty: 2.5,
    stability: 0,
    reps: 0,
    lapses: 0,
    scheduled_days: 1,
    elapsed_days: 0,
    last_review: new Date(),
    state: 0,
    due: new Date(Date.now() + 86400000), // tomorrow
  },
  firstLearn: {
    isNew: false,
    due: new Date(),
    state: 2,
    consecutiveGood: 2,
  },
  grade: -1,
  difficulty: 2.5,
  nextReviewInterval: 1,
};

export const mockCardNew = {
  id: "new-card-id",
  front: "New question",
  back: "New answer",
  tags: ["new"],
  firstLearn: {
    isNew: true,
    due: new Date(Date.now() - 60000), // 1 min ago (due)
    state: 0,
    consecutiveGood: 0,
  },
  grade: -1,
  difficulty: 2.5,
};

export const mockSeason = {
  seasonId: mockSeasonId,
  startAt: new Date("2024-01-01T00:00:00Z"),
  endAt: new Date("2024-01-08T00:00:00Z"),
  status: "active",
  createdAt: new Date(),
};

export const mockGroup = {
  id: mockGroupId,
  createdAt: new Date(),
  isFull: false,
  capacity: 20,
  currentCount: 5,
  seasonId: mockSeasonId,
  leagueNumber: mockLeagueNumber,
};

export const mockNotification = {
  id: "notification-id-123",
  title: "Test Notification",
  body: "Test body",
  type: "info" as const,
  read: false,
  createdAt: new Date(),
};

export const mockSearchLog = {
  id: "search-log-id-123",
  userId: mockUserId,
  searchText: "test search",
  filters: {},
  resultsCount: 5,
  timestamp: new Date(),
};

export const mockUserSettings = {
  theme: "light" as const,
  notificationsEnabled: true,
  dailyGoal: 10,
  dailyNew: 5,
  language: "en",
};

export const mockStudySession = {
  id: "session-id-123",
  deckId: mockDeckId,
  cardId: mockCardId,
  grade: 3,
  date: new Date(),
  reviewTime: Date.now(),
};

