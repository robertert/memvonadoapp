// SuperMemo.ts
interface SuperMemoResult {
  interval: number;
  difficulty: number;
}

class SuperMemo2 {
  private initialDifficulty: number;
  private minimumDifficulty: number;
  private difficultyIncrement: number;
  private initialInterval: number;

  constructor() {
    // Initial difficulty level (can be adjusted based on the item)
    this.initialDifficulty = 2.5;
    // Minimum difficulty level
    this.minimumDifficulty = 1.3;
    // Factor by which the difficulty will increase or decrease
    this.difficultyIncrement = 1;
    // Initial interval (in days) for the first review
    this.initialInterval = 1;
  }

  calculate(grade: number, prevDifficulty: number, prevInterval: number): SuperMemoResult {
    // Calculate new difficulty level
    const newDifficulty =
      prevDifficulty +
      this.difficultyIncrement *
        (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    // Ensure difficulty level doesn't drop below minimum
    const difficulty = Math.max(this.minimumDifficulty, newDifficulty);

    // Calculate new interval
    const factor = 0.15 - 0.08 * grade;
    const interval = prevInterval * Math.pow(2, prevDifficulty - 1) * factor;

    // Adjust the interval based on the difficulty level
    const adjustedInterval = Math.max(interval, this.initialInterval);

    return { interval: interval, difficulty: difficulty };
  }
}

export default SuperMemo2;
