import type { Card } from "../../src/types/common";

interface DailyStatsLike {
  newCardsRemaining: number;
  dueCardsRemaining: number;
  inProgressDueCards: number;
  inProgressNewCards: number;
  completedNewToday: number;
  completedDueToday: number;
}

export interface SessionLearningItem {
  card: Card;
  direction: "forward" | "reverse";
}

export function assertDailyStatsNonNegative(stats: DailyStatsLike): void {
  expect(stats.newCardsRemaining).toBeGreaterThanOrEqual(0);
  expect(stats.dueCardsRemaining).toBeGreaterThanOrEqual(0);
  expect(stats.inProgressDueCards).toBeGreaterThanOrEqual(0);
  expect(stats.inProgressNewCards).toBeGreaterThanOrEqual(0);
  expect(stats.completedNewToday).toBeGreaterThanOrEqual(0);
  expect(stats.completedDueToday).toBeGreaterThanOrEqual(0);
}

export function assertDailyStatsRespectLimit(
  stats: DailyStatsLike,
  itemLimit: number
): void {
  const consumed = stats.inProgressNewCards + stats.completedNewToday;
  expect(consumed).toBeLessThanOrEqual(itemLimit);
}

export function assertNoDuplicateSessionItems(
  items: SessionLearningItem[]
): void {
  const uniqueKeys = new Set(
    items.map((item) => `${item.card.id}:${item.direction}`)
  );
  expect(uniqueKeys.size).toBe(items.length);
}

