import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { DailyStatsSchema, type DailyStats } from "memvocado-types";
import type { StatsRepository } from "../interfaces/StatsRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of StatsRepository.
 */
export class FirestoreStatsRepository implements StatsRepository {
  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<DailyStats | null>} Daily stats or null
   */
  async getDeckDailyStats(
    userId: string,
    deckId: string
  ): Promise<DailyStats | null> {
    const snap = await db.doc(`users/${userId}/decks/${deckId}`).get();
    if (!snap.exists) {
      return null;
    }
    const dailyStats = snap.data()?.dailyStats;
    if (!dailyStats) {
      return null;
    }
    return DailyStatsSchema.parse(dailyStats);
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {DailyStats} stats - Stats to write
   * @return {Promise<void>}
   */
  async setDeckDailyStats(
    userId: string,
    deckId: string,
    stats: DailyStats
  ): Promise<void> {
    const validatedStats = DailyStatsSchema.parse(stats);
    await db.doc(`users/${userId}/decks/${deckId}`).update({ dailyStats: validatedStats });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {DailyStats} newDeckStats - New deck-level daily stats
   * @param {DailyStats | null} previousDeckStats - Previous deck-level daily stats
   * @return {Promise<void>}
   */
  async updateDailyStats(
    userId: string,
    deckId: string,
    newDeckStats: DailyStats,
    previousDeckStats: DailyStats | null
  ): Promise<void> {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);
    const userRef = db.doc(`users/${userId}`);

    const validatedDailyStats = DailyStatsSchema.parse(newDeckStats);
    const validatedBefore = previousDeckStats ?? {
      completedNewToday: 0,
      completedDueToday: 0,
    };

    const completedNewDiff =
      validatedDailyStats.completedNewToday - validatedBefore.completedNewToday;
    const completedDueDiff =
      validatedDailyStats.completedDueToday - validatedBefore.completedDueToday;

    const batch = db.batch();
    batch.update(deckRef, {
      dailyStats: {
        ...validatedDailyStats,
        lastUpdatedStats: new Date(),
      },
    });
    batch.update(userRef, {
      "dailyStats.completedNewToday": FieldValue.increment(completedNewDiff),
      "dailyStats.completedDueToday": FieldValue.increment(completedDueDiff),
      "dailyStats.lastUpdatedStats": new Date(),
    });
    await batch.commit();
  }
}
