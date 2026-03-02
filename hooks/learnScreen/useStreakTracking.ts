import { useState } from "react";
import { CardGrade } from "@/types/schemas";
import { playSound } from "@/utils/soundTrigger";
import {
  STREAK_MILESTONE,
  STREAK_ACHIEVED_CLEAR_MS,
  STREAK_LOST_CLEAR_MS,
} from "../../constants/learningConstants";

export function useStreakTracking() {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakAchieved, setStreakAchieved] = useState(false);
  const [streakLost, setStreakLost] = useState(false);

  function handleAnswer(grade: CardGrade): void {
    if (grade === CardGrade.Good) playSound("good");
    else if (grade === CardGrade.Wrong) playSound("wrong");
    else if (grade === CardGrade.Hard) playSound("hard");
    else if (grade === CardGrade.Easy) playSound("easy");

    if (grade === CardGrade.Good || grade === CardGrade.Easy) {
      setCurrentStreak((prev) => {
        const next = prev + 1;
        if (next === STREAK_MILESTONE) {
          setStreakAchieved(true);
          setTimeout(() => setStreakAchieved(false), STREAK_ACHIEVED_CLEAR_MS);
        }
        return next;
      });
      setStreakLost(false);
    } else {
      setCurrentStreak((prev) => {
        if (prev > 0) {
          setStreakLost(true);
          setTimeout(() => setStreakLost(false), STREAK_LOST_CLEAR_MS);
        }
        return 0;
      });
    }
  }

  return {
    currentStreak,
    streakAchieved,
    streakLost,
    handleAnswer,
    clearStreakAchieved: () => setStreakAchieved(false),
  };
}
