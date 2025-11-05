/**
 * Common types used across Cloud Functions
 */

export interface DeckData {
  id: string;
  title: string;
  category: string;
  views: number;
  likes: number;
  cardsNum: number;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  settings: object;
}

export interface DeckLearningData {
  id: string;
  title: string;
  category: string;
  cardsNum: number;
  zenMode?: boolean;
  dueCardsNumPerDay?: number;
  newCardsNumPerDay?: number;
  todoCardsNum: number;
  doneCardsNum: number;
  lastReviewDate?: Date;
}

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

/**
 * Helper function to transform flat card structure to nested structure
 * @param {any} doc - Firestore document snapshot or data object
 * @return {any} Transformed card with nested cardData structure
 */
export function transformCardData(doc: any): any {
  const data = doc.data ? doc.data() : doc;
  const docId = doc.id || data.id;
  return {
    id: docId,
    cardData: {
      front: data.front || "",
      back: data.back || "",
      tags: data.tags || [],
    },
    cardAlgo: data.cardAlgo || undefined,
    firstLearn: data.firstLearn || undefined,
  };
}
