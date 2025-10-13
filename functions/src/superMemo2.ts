/**
 * SuperMemo2 Algorithm Implementation
 */
export class SuperMemo2 {
  private minimumDifficulty = 1.3;
  private difficultyIncrement = 1;
  private initialInterval = 1;

  /**
   * Calculate next review interval and difficulty
   * @param {number} grade - User's grade (1-5)
   * @param {number} prevDifficulty - Previous difficulty level
   * @param {number} prevInterval - Previous interval
   * @return {SuperMemoResult} New interval and difficulty
   */
  calculate(
    grade: number,
    prevDifficulty: number,
    prevInterval: number,
  ): SuperMemoResult {
    const newDifficulty =
      prevDifficulty +
      this.difficultyIncrement *
        (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));

    const difficulty = Math.max(this.minimumDifficulty, newDifficulty);
    const factor = 0.15 - 0.08 * grade;
    const interval = prevInterval * Math.pow(2, prevDifficulty - 1) * factor;
    const adjustedInterval = Math.max(interval, this.initialInterval);

    return {interval: adjustedInterval, difficulty};
  }
}

import {SuperMemoResult} from "./types/common";
