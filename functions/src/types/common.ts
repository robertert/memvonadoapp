/**
 * Common types used across Cloud Functions
 */

export interface CardData {
  front: string;
  back: string;
  tags: string[];
  lastReviewDate?: Date;
  difficulty?: number;
  nextReviewInterval?: number;
  grade?: number;
  nextReviewDate?: Date;
}

export interface SuperMemoResult {
  interval: number;
  difficulty: number;
}

export interface SearchFilters {
  subject?: string;
  difficulty?: number;
  isPublic?: boolean;
}

export interface UserStats {
  totalCards: number;
  totalDecks: number;
  totalReviews: number;
  averageDifficulty: number;
  lastStudyDate?: Date;
}

export interface StudySession {
  id: string;
  deckId: string;
  cardsReviewed: number;
  correctAnswers: number;
  date: Date;
  duration: number;
}
