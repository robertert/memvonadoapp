/**
 * SuperMemo2 Algorithm Implementation
 */
export declare class SuperMemo2 {
    private minimumDifficulty;
    private difficultyIncrement;
    private initialInterval;
    /**
     * Calculate next review interval and difficulty
     * @param {number} grade - User's grade (1-5)
     * @param {number} prevDifficulty - Previous difficulty level
     * @param {number} prevInterval - Previous interval
     * @return {SuperMemoResult} New interval and difficulty
     */
    calculate(grade: number, prevDifficulty: number, prevInterval: number): SuperMemoResult;
}
import { SuperMemoResult } from "./types/common";
