import { PLACEHOLDER_MODE } from "./flags";
import {
  DeckSchema,
  NotificationSchema,
  UserSchema,
  CardSchema,
  LeagueGroupMemberSchema,
  DeckLearningDataSchema,
} from "@/types/schemas";
import type {
  Deck,
  Notification,
  User,
  Card,
  LeagueGroupMember,
  DeckLearningData,
} from "@/types";

// Walidacja i eksport danych placeholder użytkownika zgodnych z UserSchema
const _placeholderUser = {
  id: "placeholder-user",
  username: "DemoUser",
  email: "demo@example.com",
  settings: {
    theme: "light",
    notificationsEnabled: true,
    dailyGoal: 120,
    dailyNew: 20,
    language: "en",
    timeZone: "UTC",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  league: 3,
  currentGroupId: "group-demo",
  experiencePoints: 1250,
  currencyCount: 0,
  stats: {
    totalCards: 42,
    totalDecks: 5,
    totalReviews: 128,
    averageDifficulty: 2.6,
    currentStreak: 5,
    longestStreak: 7,
    // lastStreakDate i lastStudyDate mogą być pominięte
  },
  avocadoGrowth: {
    currentPhase: 1,
    consecutiveDays: 0,
    lastGrowthDate: new Date(),
    totalHarvests: 0,
    collectedSkins: [],
    harvestHistory: [],
  },
  followingCount: 8,
  followersCount: 10,
};

export const placeholderUser: User = UserSchema.parse(_placeholderUser);

// Walidacja i eksport danych placeholder talii zgodnych z DeckSchema
const _placeholderDecks = [
  {
    id: "deck-1",
    title: "Angielski - Słówka podstawowe",
    category: "Języki obce",
    icon: "cards",
    tags: ["podstawowe"],
    isPublic: true,
    views: 73,
    likes: 12,
    cardsNum: 10,
    createdBy: "placeholder-user",
    createdAt: new Date(),
    updatedAt: new Date(),
    is_deleted: false,
  },
  {
    id: "deck-2",
    title: "Geografia - Stolice Europy",
    category: "Geografia",
    icon: "cards",
    tags: ["stolice"],
    isPublic: true,
    views: 51,
    likes: 9,
    cardsNum: 10,
    createdBy: "placeholder-user",
    createdAt: new Date(),
    updatedAt: new Date(),
    is_deleted: false,
  },
];

export const placeholderDecks: Deck[] = _placeholderDecks.map((deck) =>
  DeckSchema.parse(deck)
);

export const placeholderDecksLearningData: DeckLearningData[] =
  _placeholderDecks.map((deck) =>
    DeckLearningDataSchema.parse({
      id: deck.id,
      title: deck.title,
      category: deck.category,
      icon: deck.icon,
      tags: deck.tags,
      isPublic: deck.isPublic,
      cardsNum: deck.cardsNum,
      updatedAt: deck.updatedAt,
      settings: {
        dueCardsNumPerDay: 10,
        newCardsNumPerDay: 10,
        zenMode: false,
        shuffleNewCards: false,
      },
    })
  );

// Walidacja i eksport danych placeholder kart zgodnych z CardSchema
const _placeholderCards = [
  {
    id: "c1",
    cardData: { front: "Cześć", back: "Hello" },
    tags: ["podstawowe"],
    firstLearn: { isNew: true },
    createdAt: new Date(),
  },
  {
    id: "c2",
    cardData: { front: "Dziękuję", back: "Thank you" },
    tags: ["podstawowe"],
    firstLearn: { isNew: true },
    createdAt: new Date(),
  },
  {
    id: "c3",
    cardData: { front: "Stolica Polski", back: "Warszawa" },
    tags: ["stolice"],
    firstLearn: { isNew: true },
    createdAt: new Date(),
  },
];

export const placeholderCards: Card[] = _placeholderCards.map((card) =>
  CardSchema.parse(card)
);

// Walidacja i eksport danych placeholder powiadomień zgodnych z NotificationSchema
const _placeholderNotifications = [
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

export const placeholderNotifications: Notification[] =
  _placeholderNotifications.map((notif) => NotificationSchema.parse(notif));

// Walidacja i eksport danych placeholder rankingu zgodnych z LeagueGroupMemberSchema
const _placeholderRanking = {
  entries: [
    {
      id: "u1",
      username: "Alice",
      points: 1540,
      lastActivityAt: new Date(),
    },
    {
      id: "placeholder-user",
      username: "DemoUser",
      points: 1250,
      lastActivityAt: new Date(),
    },
    {
      id: "u3",
      username: "Bob",
      points: 980,
      lastActivityAt: new Date(),
    },
    {
      id: "u4",
      username: "Charlie",
      points: 880,
      lastActivityAt: new Date(),
    },
    {
      id: "u5",
      username: "Diana",
      points: 780,
      lastActivityAt: new Date(),
    },
    {
      id: "u6",
      username: "Ethan",
      points: 680,
      lastActivityAt: new Date(),
    },
    {
      id: "u7",
      username: "Fiona",
      points: 580,
      lastActivityAt: new Date(),
    },
    {
      id: "u8",
      username: "George",
      points: 480,
      lastActivityAt: new Date(),
    },
  ],
};

export const placeholderRanking: LeagueGroupMember[] =
  _placeholderRanking.entries.map((entry) =>
    LeagueGroupMemberSchema.parse(entry)
  );

// Prosty helper do zwracania placeholderów, gdy włączony jest PLACEHOLDER_MODE
export function usePlaceholderIfNeeded<T>(
  data: T | undefined,
  fallback: T
): T | undefined {
  if (!PLACEHOLDER_MODE) return data;
  return data ?? fallback;
}
