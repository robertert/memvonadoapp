import { DailyStats } from "@/types/schemas/deck";

export const calculateDailyStatsProgress = (
  dailyStats: DailyStats | null
): number => {
  return Math.round(
    dailyStats
      ? ((dailyStats?.completedNewToday + dailyStats?.completedDueToday) *
          100) /
          (dailyStats?.dueCardsRemaining +
            dailyStats?.inProgressDueCards +
            dailyStats?.inProgressNewCards +
            dailyStats?.newCardsRemaining +
            dailyStats?.completedNewToday +
            dailyStats?.completedDueToday || 1)
      : 0
  );
};
