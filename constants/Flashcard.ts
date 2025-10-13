import SuperMemo2 from "./SuperMemo2";

interface FlashcardData {
  question: string;
  answer: string;
  lastReviewDate: Date;
  difficulty: number;
  nextReviewInterval: number;
  grade: number;
  nextReviewDate: Date;
}

class Flashcard {
  question: string;
  answer: string;
  lastReviewDate: Date;
  difficulty: number;
  nextReviewInterval: number;
  grade: number;
  nextReviewDate: Date;

  constructor(
    question: string,
    answer: string,
    lastReviewDate: Date = new Date(),
    difficulty: number = 2.5,
    nextReviewInterval: number = 1,
    grade: number = -1,
    nextReviewDate: Date = new Date()
  ) {
    this.question = question;
    this.answer = answer;
    this.lastReviewDate = lastReviewDate;
    this.difficulty = difficulty; // Initial difficulty
    this.nextReviewInterval = nextReviewInterval; // Initial review interval
    this.grade = grade;
    this.nextReviewDate = nextReviewDate;
  }

  reviewSuperMemo(userPerformance: number): void {
    let adjustedPerformance: number;
    
    switch (userPerformance) {
      case 1:
        adjustedPerformance = 2;
        break;
      case 2:
        adjustedPerformance = 4;
        break;
      case 3:
        adjustedPerformance = 5;
        break;
      default:
        adjustedPerformance = 0;
    }
    
    const superMemo = new SuperMemo2();
    const { interval, difficulty } = superMemo.calculate(
      adjustedPerformance,
      this.difficulty,
      this.nextReviewInterval
    );

    // Update flashcard data
    this.lastReviewDate = new Date();
    this.difficulty = difficulty;
    this.nextReviewInterval = interval;
    this.grade = userPerformance;
    // Schedule next review based on interval
    // ...
  }
}

export default Flashcard;
