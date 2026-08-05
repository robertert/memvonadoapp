import { CardGrade, DailyStats, DeckLearningData } from "@/types/schemas";
import {
  HistoryEntry,
  ProgressState,
  SessionItem,
} from "../app/stack/learnScreen.types";
import { compDueDate } from "../utils/cardSchedulingHelper";

export interface SessionState {
  cards: SessionItem[];
  history: HistoryEntry[];
  dailyStats: DailyStats | null;
  progress: ProgressState;
  deck: DeckLearningData | undefined;
  status: "idle" | "loading" | "active" | "finished";
  lastGrade: CardGrade | null;
  error: string | null;
}

export const initialSessionState: SessionState = {
  cards: [],
  history: [],
  dailyStats: null,
  progress: { easy: 0, hard: 0, good: 0, wrong: 0, todo: 10, all: 20 },
  deck: undefined,
  status: "loading",
  lastGrade: null,
  error: null,
};

type SessionAction =
  | { type: "START_SESSION" }
  | {
      type: "START_SESSION_SUCCESS";
      payload: {
        cards: SessionItem[];
        dailyStats: DailyStats | null;
        deck: DeckLearningData | undefined;
      };
    }
  | {
      type: "ANSWER_CARD";
      payload: {
        grade: CardGrade;
        updatedItem: SessionItem;
        sessionItem: SessionItem | null;
        newStats: DailyStats | null;
        scheduledTimeDelta: number;
      };
    }
  | { type: "UNDO_CARD" }
  | {
      type: "UPDATE_EDITED_CARD";
      payload: { cardId: string; front: string; back: string; tags: string[] };
    }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "CLEAR_LAST_GRADE" };

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "START_SESSION":
      return { ...state, status: "loading", error: null };

    case "START_SESSION_SUCCESS": {
      const { cards, dailyStats, deck } = action.payload;
      const sorted = [...cards].sort(compDueDate);
      return {
        ...state,
        cards: sorted,
        dailyStats,
        deck,
        history: [],
        lastGrade: null,
        error: null,
        status: sorted.length === 0 ? "finished" : "active",
        progress: {
          easy: 0,
          hard: 0,
          good: 0,
          wrong: 0,
          todo: sorted.length,
          all: sorted.length,
        },
      };
    }

    case "ANSWER_CARD": {
      const { grade, sessionItem, newStats } = action.payload;
      const originalItem = state.cards[0];
      if (!originalItem) return state;

      const historyEntry: HistoryEntry = {
        item: originalItem,
        dailyStats: state.dailyStats,
        progress: state.progress,
        grade,
      };

      const tail = state.cards.slice(1);
      const nextCards = (
        sessionItem ? [sessionItem, ...tail] : tail
      ).sort(compDueDate);

      return {
        ...state,
        cards: nextCards,
        history: [...state.history, historyEntry],
        dailyStats: newStats ?? state.dailyStats,
        lastGrade: grade,
        status: nextCards.length === 0 ? "finished" : "active",
        progress: {
          ...state.progress,
          easy: grade === CardGrade.Easy ? state.progress.easy + 1 : state.progress.easy,
          good: grade === CardGrade.Good ? state.progress.good + 1 : state.progress.good,
          hard: grade === CardGrade.Hard ? state.progress.hard + 1 : state.progress.hard,
          wrong: grade === CardGrade.Wrong ? state.progress.wrong + 1 : state.progress.wrong,
          todo: nextCards.length,
        },
      };
    }

    case "UNDO_CARD": {
      if (state.history.length === 0) return state;
      const lastEntry = state.history[state.history.length - 1];
      return {
        ...state,
        cards: [lastEntry.item, ...state.cards].sort(compDueDate),
        history: state.history.slice(0, -1),
        dailyStats: lastEntry.dailyStats,
        progress: lastEntry.progress,
        status: "active",
      };
    }

    case "UPDATE_EDITED_CARD": {
      const { cardId, front, back, tags } = action.payload;
      return {
        ...state,
        cards: state.cards.map((item) =>
          item.card.id === cardId
            ? {
                ...item,
                card: {
                  ...item.card,
                  cardData: { front, back },
                  tags,
                },
              }
            : item
        ),
      };
    }

    case "SET_ERROR":
      return { ...state, error: action.payload, status: "idle" };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "CLEAR_LAST_GRADE":
      return { ...state, lastGrade: null };

    default:
      return state;
  }
}
