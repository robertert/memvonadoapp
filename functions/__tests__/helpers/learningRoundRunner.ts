import type { Card, CardGrade } from "../../src/types/common";

interface DailyStatsLike {
  newCardsRemaining: number;
  dueCardsRemaining: number;
  inProgressDueCards: number;
  inProgressNewCards: number;
  completedNewToday: number;
  completedDueToday: number;
  lastUpdatedStats: Date;
}

interface SessionLearningItem {
  card: Card;
  direction: "forward" | "reverse";
}

interface StartLearningSessionResponse {
  items: SessionLearningItem[];
  dailyStats: DailyStatsLike;
}

type WrappedCallable = (req: any) => Promise<any>;

export interface RoundSnapshot {
  roundIndex: number;
  itemsReturned: number;
  dailyStats: DailyStatsLike;
  processedInRound: number;
}

export interface RoundRunnerOptions {
  startWrapped: WrappedCallable;
  updateWrapped: WrappedCallable;
  userId: string;
  deckId: string;
  rounds: number;
  roundSize: number;
  grade: CardGrade;
  scheduledTimeMs: number;
}

function cloneStatsForUpdate(stats: DailyStatsLike): DailyStatsLike {
  return {
    ...stats,
    lastUpdatedStats: new Date(stats.lastUpdatedStats),
  };
}

function buildCardForUpdate(
  item: SessionLearningItem,
  grade: CardGrade,
  scheduledTimeMs: number
): Card {
  const nextDue = new Date(Date.now() + scheduledTimeMs);
  const card = {
    ...item.card,
    createdAt: new Date(item.card.createdAt),
    grade,
  };

  if (item.direction === "reverse") {
    if (card.firstLearnReverse?.isFirst) {
      card.firstLearnReverse = {
        ...card.firstLearnReverse,
        due: nextDue,
      };
    } else {
      card.cardAlgoReverse = {
        ...(card.cardAlgoReverse ?? {
          difficulty: 2.5,
          scheduled_days: 1,
          due: new Date(),
          reps: 0,
          state: 0,
          stability: 0,
          elapsed_days: 0,
          lapses: 0,
        }),
        due: nextDue,
      };
    }
  } else if (card.firstLearn?.isFirst) {
    card.firstLearn = {
      ...card.firstLearn,
      due: nextDue,
    };
  } else {
    card.cardAlgo = {
      ...(card.cardAlgo ?? {
        difficulty: 2.5,
        scheduled_days: 1,
        due: new Date(),
        reps: 0,
        state: 0,
        stability: 0,
        elapsed_days: 0,
        lapses: 0,
      }),
      due: nextDue,
    };
  }

  return card;
}

export async function runLearningRoundScenario(
  options: RoundRunnerOptions
): Promise<RoundSnapshot[]> {
  const snapshots: RoundSnapshot[] = [];

  for (let roundIndex = 0; roundIndex < options.rounds; roundIndex++) {
    const session = (await options.startWrapped({
      auth: { uid: options.userId },
      data: { deckId: options.deckId },
    })) as StartLearningSessionResponse;

    const toProcess = session.items.slice(0, options.roundSize);
    const statsForRequest = cloneStatsForUpdate(session.dailyStats);

    for (const item of toProcess) {
      const updatedCard = buildCardForUpdate(
        item,
        options.grade,
        options.scheduledTimeMs
      );

      await options.updateWrapped({
        auth: { uid: options.userId },
        data: {
          userId: options.userId,
          deckId: options.deckId,
          card: updatedCard,
          scheduledTime: options.scheduledTimeMs,
          dailyStats: statsForRequest,
          direction: item.direction,
        },
      });
    }

    snapshots.push({
      roundIndex,
      itemsReturned: session.items.length,
      dailyStats: session.dailyStats,
      processedInRound: toProcess.length,
    });
  }

  return snapshots;
}

