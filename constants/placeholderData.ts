import { PLACEHOLDER_MODE } from "./flags";

export const placeholderUser = {
  userId: "placeholder-user",
  username: "DemoUser",
  email: "demo@example.com",
  stats: {
    totalCards: 42,
    totalDecks: 5,
    totalReviews: 128,
    averageDifficulty: 2.6,
  },
  streak: 5,
  league: 3,
  points: 1250,
  friendsCount: 3,
  followers: 10,
  following: 8,
};

export const placeholderDecks = [
  {
    id: "deck-1",
    title: "Angielski - Słówka podstawowe",
    subject: "Języki obce",
    views: 73,
    likes: 12,
    cardsNum: 10,
    createdBy: "placeholder-user",
    createdAt: new Date(),
    isPublic: true,
    settings: {},
  },
  {
    id: "deck-2",
    title: "Geografia - Stolice Europy",
    subject: "Geografia",
    views: 51,
    likes: 9,
    cardsNum: 10,
    createdBy: "placeholder-user",
    createdAt: new Date(),
    isPublic: true,
    settings: {},
  },
];

export const placeholderCards = [
  {
    id: "c1",
    cardData: { front: "Cześć", back: "Hello", tags: ["podstawowe"] },
  },
  {
    id: "c2",
    cardData: { front: "Dziękuję", back: "Thank you", tags: ["podstawowe"] },
  },
  {
    id: "c3",
    cardData: { front: "Stolica Polski", back: "Warszawa", tags: ["stolice"] },
  },
];

export const placeholderNotifications = [
  {
    id: "n1",
    title: "Witaj w Memvocado! 🎉",
    body: "To jest tryb prezentacyjny z przykładowymi danymi.",
    type: "info" as const,
    read: false,
    createdAt: new Date(),
  },
  {
    id: "n2",
    title: "Gratulacje! 🏆",
    body: "Masz 5-dniową serię nauki.",
    type: "success" as const,
    read: false,
    createdAt: new Date(),
  },
];

export const placeholderRanking = {
  entries: [
    {
      userId: "u1",
      username: "Alice",
      points: 1540,
      position: 1,
      lastActivityAt: new Date(),
    },
    {
      userId: "placeholder-user",
      username: "DemoUser",
      points: 1250,
      position: 2,
      lastActivityAt: new Date(),
    },
    {
      userId: "u3",
      username: "Bob",
      points: 980,
      position: 3,
      lastActivityAt: new Date(),
    },
  ],
  groupId: "grp-1",
  leagueNumber: 3,
  seasonId: "S-2025-45",
  totalMembers: 20,
};

// Prosty helper do zwracania placeholderów, gdy włączony jest PLACEHOLDER_MODE
export function usePlaceholderIfNeeded<T>(
  data: T | undefined,
  fallback: T
): T | undefined {
  if (!PLACEHOLDER_MODE) return data;
  return data ?? fallback;
}
