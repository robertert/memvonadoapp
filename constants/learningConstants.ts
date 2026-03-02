import type { CardAlgo } from "@/types/schemas";

export const FIRST_LEARN_DELAY_GOOD_MS = 10 * 60 * 1000; // 10 min
export const FIRST_LEARN_DELAY_HARD_MS = 5 * 60 * 1000; //  5 min
export const FIRST_LEARN_DELAY_WRONG_MS = 2 * 60 * 1000; //  2 min
export const FSRS_WRONG_SESSION_DELAY_MS = 10 * 60 * 1000; // 10 min — session requeue delay for wrong FSRS cards

export const STREAK_MILESTONE = 5;
export const STREAK_ACHIEVED_CLEAR_MS = 2000;
export const STREAK_LOST_CLEAR_MS = 800;
export const TOOLTIP_DURATION_MS = 2000;

// Use as spread base only — `due` must be overwritten at call site
export const DEFAULT_CARD_ALGO: CardAlgo = {
  difficulty: 2.5,
  scheduled_days: 1,
  due: new Date(),
  reps: 0,
  state: 0,
  stability: 0,
  elapsed_days: 0,
  lapses: 0,
};
