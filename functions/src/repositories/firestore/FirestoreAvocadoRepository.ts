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

export class FirestoreAvocadoRepository implements AvocadoRepository {
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

  async updateAvocadoGrowth(userId: string, data: Record<string, unknown>): Promise<void> {
    await db.doc(`users/${userId}`).update(data);
  }

  async getAvocadoConfig(): Promise<AvocadoConfig | null> {
    const snap = await db.doc("admin/avocadoConfig").get();
    if (!snap.exists) return null;
    return AvocadoConfigSchema.parse(snap.data());
  }

  async getStreakThreshold(): Promise<number> {
    const snap = await db.doc("admin/settings").get();
    return (snap.data()?.streakThreshold as number) || 50;
  }

  /** Increment avocadoGrowth.totalHarvests by 1 using FieldValue */
  async incrementTotalHarvests(userId: string): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.totalHarvests": FieldValue.increment(1),
    });
  }

  /** Append to avocadoGrowth.harvestHistory */
  async arrayUnionHarvestHistory(
    userId: string,
    harvestLog: { skinId: string; harvestedAt: Date }
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.harvestHistory": FieldValue.arrayUnion(harvestLog),
    });
  }

  /** Append to avocadoGrowth.collectedSkins */
  async arrayUnionCollectedSkin(
    userId: string,
    skin: { id: string; name: string; rarity: string; obtainedAt: Date }
  ): Promise<void> {
    await db.doc(`users/${userId}`).update({
      "avocadoGrowth.collectedSkins": FieldValue.arrayUnion(skin),
    });
  }

  /** Perform all harvest writes atomically */
  async applyHarvest(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    await db.doc(`users/${userId}`).update(updates);
  }
}
