import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  AvocadoGrowthSchema,
  AvocadoConfigSchema,
  UserSettingsSchema,
  UserDailyStatsSchema,
  type AvocadoConfig,
} from "memvocado-types";
import type { AvocadoRepository, AvocadoUserData } from "../interfaces/AvocadoRepository";

const db = getFirestore();

/**
 * Firestore-backed implementation of AvocadoRepository.
 * @class
 */
export class FirestoreAvocadoRepository implements AvocadoRepository {
  /**
   * @param {string} userId - User ID
   * @return {Promise<AvocadoUserData | null>} User avocado data or null
   */
  async getUser(userId: string): Promise<AvocadoUserData | null> {
    const snap = await db.doc(`users/${userId}`).get();
    if (!snap.exists) return null;

    const data = snap.data() || {};
    return {
      avocadoGrowth: AvocadoGrowthSchema.partial().parse(data.avocadoGrowth ?? {}),
      settings: UserSettingsSchema.partial().parse(data.settings ?? {}),
      dailyStats: UserDailyStatsSchema.partial().parse(data.dailyStats ?? {}),
    };
  }

  /**
   * @param {string} userId - User ID
   * @param {Record<string, unknown>} data - Fields to update
   * @return {Promise<void>}
   */
  async updateAvocadoGrowth(userId: string, data: Record<string, unknown>): Promise<void> {
    await db.doc(`users/${userId}`).update(data);
  }

  /**
   * @return {Promise<AvocadoConfig | null>} Avocado config or null
   */
  async getAvocadoConfig(): Promise<AvocadoConfig | null> {
    const snap = await db.doc("admin/avocadoConfig").get();
    if (!snap.exists) return null;
    return AvocadoConfigSchema.parse(snap.data());
  }

  /**
   * @return {Promise<number>} Streak threshold value
   */
  async getStreakThreshold(): Promise<number> {
    const snap = await db.doc("admin/settings").get();
    return (snap.data()?.streakThreshold as number) || 50;
  }

  /**
   * Increment avocadoGrowth.totalHarvests by 1 using FieldValue
   * @param {string} userId - User ID
   * @return {Promise<void>}
   */
  async incrementTotalHarvests(userId: string): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.totalHarvests": FieldValue.increment(1),
    });
  }

  /**
   * Append to avocadoGrowth.harvestHistory
   * @param {string} userId - User ID
   * @param {object} harvestLog - Harvest log entry
   * @return {Promise<void>}
   */
  async arrayUnionHarvestHistory(
    userId: string,
    harvestLog: { skinId: string; harvestedAt: Date }
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.harvestHistory": FieldValue.arrayUnion(harvestLog),
    });
  }

  /**
   * Append to avocadoGrowth.collectedSkins
   * @param {string} userId - User ID
   * @param {object} skin - Skin to add
   * @return {Promise<void>}
   */
  async arrayUnionCollectedSkin(
    userId: string,
    skin: { id: string; name: string; rarity: string; obtainedAt: Date }
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.collectedSkins": FieldValue.arrayUnion(skin),
    });
  }

  /**
   * Perform all harvest writes atomically
   * @param {string} userId - User ID
   * @param {Record<string, unknown>} updates - Fields to update
   * @return {Promise<void>}
   */
  async applyHarvest(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}`).update(updates);
  }
}
