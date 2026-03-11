import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {
  type AvocadoConfig,
  type AvocadoSkinConfig,
  type AvocadoSkin,
  type AvocadoHarvestLog,
} from "memvocado-types";
import type { AvocadoRepository } from "../repositories/interfaces/AvocadoRepository";
import { formatYmdInTimeZone } from "../utils/dateUtils";

const DAYS_TO_PHASE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
};

const AVOCADO_TOTAL_DAYS = 7;

const DEFAULT_CONFIG: AvocadoConfig = {
  skins: [
    { id: "classic_avo", name: "Klasyczne", rarity: "common", weight: 20 },
    { id: "sport_avo", name: "Sportowe", rarity: "common", weight: 20 },
    { id: "chef_avo", name: "Kucharz", rarity: "common", weight: 20 },
    { id: "space_avo", name: "Kosmiczne", rarity: "epic", weight: 2 },
    { id: "painter_avo", name: "Malarz", rarity: "common", weight: 20 },
    { id: "ninja_avo", name: "Ninja", rarity: "rare", weight: 5 },
    { id: "sensei_avo", name: "Sensi", rarity: "rare", weight: 5 },
    { id: "detective_avo", name: "Detektyw", rarity: "rare", weight: 5 },
    { id: "king_avo", name: "Król", rarity: "epic", weight: 1 },
    { id: "robot_avo", name: "Robot", rarity: "epic", weight: 2 },
    { id: "sleepy_avo", name: "Śpiące", rarity: "rare", weight: 5 },
  ],
  phaseDaysRequired: 1,
  totalPhases: 5,
};

export interface AvocadoUpdateGrowthResult {
  updated: boolean;
  previousPhase: number;
  currentPhase: number;
  consecutiveDays: number;
  canHarvest: boolean;
}

export interface AvocadoResetGrowthResult {
  wasReset: boolean;
  hadPendingHarvest: boolean;
  previousDays: number;
}

/**
 * Service for avocado growth and harvest logic.
 * @class
 */
export class AvocadoService {
  /**
   * @param {AvocadoRepository} repo - Avocado repository
   */
  constructor(private readonly repo: AvocadoRepository) {}

  /**
   * @param {AvocadoSkinConfig[]} skins - Available skins with weights
   * @return {AvocadoSkinConfig} Randomly selected skin
   */
  private rollGacha(skins: AvocadoSkinConfig[]): AvocadoSkinConfig {
    const totalWeight = skins.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const skin of skins) {
      random -= skin.weight;
      if (random <= 0) return skin;
    }
    return skins[0];
  }

  /**
   * @return {Promise<AvocadoConfig>} Avocado config, falling back to defaults
   */
  async getConfig(): Promise<AvocadoConfig> {
    try {
      const config = await this.repo.getAvocadoConfig();
      return config ?? DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<object>} Current avocado growth status
   */
  async getStatus(userId: string): Promise<{
    currentPhase: number;
    consecutiveDays: number;
    lastGrowthDate: string | null;
    totalHarvests: number;
    collectedSkins: AvocadoSkin[];
    harvestHistory: AvocadoHarvestLog[];
    canHarvest: boolean;
    isWilted: boolean;
    goalMetToday: boolean;
  }> {
    const userData = await this.repo.getUser(userId);
    if (!userData) throw new Error("User not found");

    const { avocadoGrowth: growth, settings, dailyStats } = userData;
    const tz = settings.timeZone || "UTC";
    const now = new Date();
    const todayYmd = formatYmdInTimeZone(now, tz);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayYmd = formatYmdInTimeZone(yesterdayDate, tz);

    const lastGrowthDate = growth.lastGrowthDate;
    const lastGrowthYmd = lastGrowthDate instanceof Date
      ? formatYmdInTimeZone(lastGrowthDate, tz)
      : null;

    const threshold = await this.repo.getStreakThreshold();
    const todayCount = (dailyStats.completedNewToday ?? 0) + (dailyStats.completedDueToday ?? 0);
    const goalMetToday = todayCount >= threshold;

    const consecutiveDays = growth.consecutiveDays ?? 0;
    const isWilted =
      !goalMetToday &&
      lastGrowthYmd !== todayYmd &&
      lastGrowthYmd !== yesterdayYmd &&
      consecutiveDays > 0;

    const canHarvest = consecutiveDays >= AVOCADO_TOTAL_DAYS;

    return {
      currentPhase: growth.currentPhase ?? 1,
      consecutiveDays,
      lastGrowthDate: lastGrowthYmd,
      totalHarvests: growth.totalHarvests ?? 0,
      collectedSkins: growth.collectedSkins ?? [],
      harvestHistory: growth.harvestHistory ?? [],
      canHarvest,
      isWilted,
      goalMetToday,
    };
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<object>} Harvest result with awarded skin
   */
  async harvest(userId: string): Promise<{
    success: boolean;
    awardedSkin: { id: string; name: string; rarity: string; obtainedAt: Date };
    isNewSkin: boolean;
    totalHarvests: number;
  }> {
    const userData = await this.repo.getUser(userId);
    if (!userData) throw new Error("User not found");

    const { avocadoGrowth: growth } = userData;
    const consecutiveDays = growth.consecutiveDays ?? 0;
    if (consecutiveDays < AVOCADO_TOTAL_DAYS) {
      throw new Error(`Cannot harvest yet. Days: ${consecutiveDays}/${AVOCADO_TOTAL_DAYS}`);
    }

    const config = await this.getConfig();
    const rolledSkin = this.rollGacha(config.skins);
    const now = new Date();
    const existingSkins = growth.collectedSkins ?? [];
    const isNewSkin = !existingSkins.some((s: AvocadoSkin) => s.id === rolledSkin.id);

    const newSkin = { id: rolledSkin.id, name: rolledSkin.name, rarity: rolledSkin.rarity, obtainedAt: now };
    const harvestLog = { skinId: rolledSkin.id, harvestedAt: now };

    const updates: Record<string, unknown> = {
      "avocadoGrowth.consecutiveDays": 0,
      "avocadoGrowth.currentPhase": 1,
      "avocadoGrowth.lastGrowthDate": null,
      "avocadoGrowth.totalHarvests": FieldValue.increment(1),
      "avocadoGrowth.harvestHistory": FieldValue.arrayUnion(harvestLog),
    };
    if (isNewSkin) {
      updates["avocadoGrowth.collectedSkins"] = FieldValue.arrayUnion(newSkin);
    }

    await this.repo.updateAvocadoGrowth(userId, updates);

    logger.info("Avocado harvested", { userId, skinId: rolledSkin.id, rarity: rolledSkin.rarity, isNewSkin });

    return {
      success: true,
      awardedSkin: newSkin,
      isNewSkin,
      totalHarvests: (growth.totalHarvests ?? 0) + 1,
    };
  }

  /**
   * @param {string} userId - User ID
   * @param {string} timeZone - User's time zone
   * @return {Promise<AvocadoUpdateGrowthResult>} Growth update result
   */
  async updateGrowth(userId: string, timeZone: string): Promise<AvocadoUpdateGrowthResult> {
    const userData = await this.repo.getUser(userId);
    if (!userData) throw new Error("User not found");

    const { avocadoGrowth: growth } = userData;
    const tz = timeZone || "UTC";
    const now = new Date();
    const todayYmd = formatYmdInTimeZone(now, tz);

    const lastGrowthDate = growth.lastGrowthDate;
    const lastGrowthYmd = lastGrowthDate instanceof Date
      ? formatYmdInTimeZone(lastGrowthDate, tz)
      : null;

    const previousDays = growth.consecutiveDays ?? 0;
    const previousPhase = DAYS_TO_PHASE[Math.min(previousDays, AVOCADO_TOTAL_DAYS)] ?? 1;

    // Idempotent — already updated today
    if (lastGrowthYmd === todayYmd) {
      const currentDays = previousDays;
      const currentPhase = DAYS_TO_PHASE[Math.min(currentDays, AVOCADO_TOTAL_DAYS)] ?? 1;
      return { updated: false, previousPhase: currentPhase, currentPhase, consecutiveDays: currentDays, canHarvest: currentDays >= AVOCADO_TOTAL_DAYS };
    }

    const currentDays = previousDays + 1;
    const clampedDays = Math.min(currentDays, AVOCADO_TOTAL_DAYS);
    const newPhase = DAYS_TO_PHASE[clampedDays] ?? 1;

    await this.repo.updateAvocadoGrowth(userId, {
      "avocadoGrowth.consecutiveDays": currentDays,
      "avocadoGrowth.currentPhase": newPhase,
      "avocadoGrowth.lastGrowthDate": now,
    });

    logger.info("Avocado growth updated", { userId, previousPhase, consecutiveDays: currentDays, currentPhase: newPhase });

    return { updated: true, previousPhase, currentPhase: newPhase, consecutiveDays: currentDays, canHarvest: currentDays >= AVOCADO_TOTAL_DAYS };
  }

  /**
   * @param {string} userId - User ID
   * @return {Promise<AvocadoResetGrowthResult>} Reset result
   */
  async resetGrowth(userId: string): Promise<AvocadoResetGrowthResult> {
    const userData = await this.repo.getUser(userId);
    if (!userData) throw new Error("User not found");

    const { avocadoGrowth: growth } = userData;
    const previousDays = growth.consecutiveDays ?? 0;
    const hadPendingHarvest = previousDays >= AVOCADO_TOTAL_DAYS;

    // Don't reset if harvest is pending
    if (hadPendingHarvest) {
      return { wasReset: false, hadPendingHarvest: true, previousDays };
    }

    await this.repo.updateAvocadoGrowth(userId, {
      "avocadoGrowth.consecutiveDays": 0,
      "avocadoGrowth.currentPhase": 1,
      "avocadoGrowth.lastGrowthDate": null,
    });

    logger.info("Avocado growth reset", { userId, previousDays });

    return { wasReset: true, hadPendingHarvest: false, previousDays };
  }
}
