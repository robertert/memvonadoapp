import type {
  Card,
  CardAlgo,
  FirstLearn,
  DeckLearningData,
  User,
  DailyStats,
} from "memvocado-types";

export function makeCardAlgo(overrides?: Partial<CardAlgo>): CardAlgo {
  return {
    difficulty: 2.5,
    scheduled_days: 1,
    due: new Date(),
    reps: 0,
    state: 0,
    stability: 0,
    elapsed_days: 0,
    lapses: 0,
    ...overrides,
  };
}

export function makeFirstLearn(overrides?: Partial<FirstLearn>): FirstLearn {
  return { isNew: true, ...overrides };
}

export function makeNewCard(id: string, overrides?: Partial<Card>): Card {
  return {
    id,
    cardData: { front: `Front ${id}`, back: `Back ${id}` },
    tags: [],
    createdAt: new Date(),
    firstLearn: makeFirstLearn({ isNew: true }),
    ...overrides,
  };
}

export function makeDueCard(id: string, daysOverdue = 1): Card {
  const dueDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);
  return {
    id,
    cardData: { front: `Front ${id}`, back: `Back ${id}` },
    tags: [],
    createdAt: new Date(),
    firstLearn: makeFirstLearn({ isNew: false }),
    cardAlgo: makeCardAlgo({ due: dueDate }),
  };
}

export function makeGraduatedCard(id: string): Card {
  return {
    id,
    cardData: { front: `Front ${id}`, back: `Back ${id}` },
    tags: [],
    createdAt: new Date(),
    firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
    cardAlgo: makeCardAlgo({ due: new Date(Date.now() - 60_000) }),
  };
}

export function makeDeck(overrides?: Partial<DeckLearningData>): DeckLearningData {
  return {
    id: "deck-1",
    title: "Test Deck",
    cardsNum: 0,
    updatedAt: new Date(),
    settings: {
      zenMode: false,
      shuffleNewCards: false,
      bidirectional: false,
    },
    ...overrides,
  } as DeckLearningData;
}

export function makeUser(overrides?: Partial<User>): User {
  return {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    settings: {
      theme: "light",
      notificationsEnabled: true,
      dailyGoal: 10,
      language: "en",
      timeZone: "UTC",
    },
    league: 0,
    currentGroupId: null,
    experiencePoints: 0,
    currencyCount: 0,
    stats: {
      totalCards: 0,
      totalDecks: 0,
      totalReviews: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    followingCount: 0,
    followersCount: 0,
    interests: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

export function makeDailyStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    newCardsRemaining: 0,
    dueCardsRemaining: 0,
    inProgressDueCards: 0,
    inProgressNewCards: 0,
    completedNewToday: 0,
    completedDueToday: 0,
    lastUpdatedStats: new Date(),
    ...overrides,
  };
}
