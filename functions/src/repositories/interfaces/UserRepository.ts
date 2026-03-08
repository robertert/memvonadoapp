import type { User, StudySessionCreate } from "memvocado-types";

export interface UserRepository {
  /** Get a user document, or null if it does not exist */
  getUser(userId: string): Promise<User | null>;

  /**
   * Partial update of a user document.
   * Supports dot-notation keys (e.g. "stats.totalReviews").
   */
  updateUser(userId: string, data: Record<string, unknown>): Promise<void>;

  /** Atomically increment a numeric field using FieldValue.increment */
  incrementField(userId: string, field: string, amount: number): Promise<void>;

  /** Append a study session sub-document and return its new document ID */
  addStudySession(userId: string, session: StudySessionCreate): Promise<string>;

  /**
   * Delete the most recently written study session for this user and card.
   * Used by undoCard to roll back the last review.
   * No-op if there are no matching study sessions.
   */
  deleteLatestStudySession(userId: string, cardId: string): Promise<void>;
}
