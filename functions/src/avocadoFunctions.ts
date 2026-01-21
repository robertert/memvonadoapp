import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import {
  AvocadoGrowthSchema,
  AvocadoConfigSchema,
  GetAvocadoStatusRequestSchema,
  GetAvocadoStatusResponseSchema,
  HarvestAvocadoRequestSchema,
  HarvestAvocadoResponseSchema,
  GetAvocadoConfigRequestSchema,
  type AvocadoConfig,
  type AvocadoSkinConfig,
  UserSettingsSchema,
  UserDailyStatsSchema,
  AvocadoSkin,
  AvocadoHarvestLog,
} from "memvocado-types";
import { serializeTimestamps } from "./utils/serialization";

const db = getFirestore();

// Domyślna konfiguracja (fallback gdy Firestore niedostępny)
const DEFAULT_AVOCADO_CONFIG: AvocadoConfig = {
  skins: [
    { id: "classic_avo", name: "Klasyczne", rarity: "common", weight: 20 },
    { id: "happy_avo", name: "Szczęśliwe", rarity: "common", weight: 20 },
    { id: "sleepy_avo", name: "Śpiące", rarity: "common", weight: 20 },
    { id: "nerd_avo", name: "Kujon", rarity: "rare", weight: 15 },
    { id: "cool_avo", name: "Ziomek", rarity: "rare", weight: 15 },
    { id: "golden_avo", name: "Złote", rarity: "epic", weight: 5 },
    { id: "glitch_avo", name: "Glitch", rarity: "epic", weight: 5 },
  ],
  phaseDaysRequired: 1,
  totalPhases: 5,
};

// Mapowanie dni na fazy
// Days 1-2 → Phase 1, Days 3-4 → Phase 2, Day 5 → Phase 3, Day 6 → Phase 4, Day 7 → Phase 5
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

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * @param {Date} date - Data do formatowania
 * @param {string} timeZone - Strefa czasowa
 * @return {string} Data w formacie YYYY-MM-DD
 * Formatuje datę na string YYYY-MM-DD w określonej strefie czasowej
 */
function formatYmdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Pobiera konfigurację awokado z Firestore lub zwraca domyślną
 */
async function getAvocadoConfig(): Promise<AvocadoConfig> {
  try {
    const configRef = db.doc("admin/avocadoConfig");
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return DEFAULT_AVOCADO_CONFIG;
    }

    const data = configSnap.data();
    return AvocadoConfigSchema.parse(data);
  } catch (error) {
    logger.warn("Failed to get avocado config, using default", error);
    return DEFAULT_AVOCADO_CONFIG;
  }
}

/**
 * @param {AvocadoSkinConfig[]} skins - Tablica skórek awokado
 * @return {AvocadoSkinConfig} Losowana skórka awokado
 * Losuje skórkę na podstawie wag
 */
function rollGacha(skins: AvocadoSkinConfig[]): AvocadoSkinConfig {
  const totalWeight = skins.reduce((sum, skin) => sum + skin.weight, 0);
  let random = Math.random() * totalWeight;

  for (const skin of skins) {
    random -= skin.weight;
    if (random <= 0) {
      return skin;
    }
  }

  // Fallback do pierwszej skórki (nie powinno się zdarzyć)
  return skins[0];
}

/*

function getDefaultAvocadoGrowth(): AvocadoGrowth {
  return {
    currentPhase: 1,
    consecutiveDays: 0,
    lastGrowthDate: undefined,
    totalHarvests: 0,
    collectedSkins: [],
    harvestHistory: [],
  };
}
*/

/**
 * Aktualizuje wzrost awokado po spełnieniu dziennego celu
 * Wywoływane wewnętrznie przez updateStreakForTodayIfQualified
 * @param {Object} params - Parametry funkcji
 * @param {string} params.userId - ID użytkownika
 * @param {string} params.timeZone - Strefa czasowa użytkownika
 * @return {Promise<{updated: boolean, previousPhase: number, currentPhase: number, consecutiveDays: number, canHarvest: boolean}>} Obiekt zawierający informacje o aktualizacji wzrostu awokado
 */
export async function updateAvocadoGrowthInternal(params: {
  userId: string;
  timeZone: string;
}): Promise<{
  updated: boolean;
  previousPhase: number;
  currentPhase: number;
  consecutiveDays: number;
  canHarvest: boolean;
}> {
  const { userId, timeZone } = params;

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userSnap.data() || {};
  const rawGrowth = userData.avocadoGrowth ?? {};
  const growth = AvocadoGrowthSchema.partial().parse(rawGrowth);

  const tz = timeZone || "UTC";
  const nowLocal = new Date();
  const todayYmd = formatYmdInTimeZone(nowLocal, tz);

  const lastGrowthDate = growth.lastGrowthDate;
  const lastGrowthYmd = lastGrowthDate instanceof Date
    ? formatYmdInTimeZone(lastGrowthDate, tz)
    : null;

  // Poprzednia faza (przed aktualizacją)
  const previousDays = growth.consecutiveDays || 0;
  const previousPhase = DAYS_TO_PHASE[Math.min(previousDays, AVOCADO_TOTAL_DAYS)] || 1;

  // Idempotencja - jeśli już zaktualizowano dzisiaj, nic nie rób
  if (lastGrowthYmd === todayYmd) {
    const currentDays = growth.consecutiveDays || 0;
    const currentPhase = DAYS_TO_PHASE[Math.min(currentDays, AVOCADO_TOTAL_DAYS)] || 1;

    return {
      updated: false,
      previousPhase: currentPhase,
      currentPhase,
      consecutiveDays: currentDays,
      canHarvest: currentDays >= AVOCADO_TOTAL_DAYS,
    };
  }

  // Zwiększ liczbę dni
  const currentDays = previousDays + 1;
  const clampedDays = Math.min(currentDays, AVOCADO_TOTAL_DAYS);
  const newPhase = DAYS_TO_PHASE[clampedDays] || 1;

  await userRef.update({
    "avocadoGrowth.consecutiveDays": currentDays,
    "avocadoGrowth.currentPhase": newPhase,
    "avocadoGrowth.lastGrowthDate": nowLocal,
  });

  logger.info("Avocado growth updated", {
    userId,
    previousPhase,
    consecutiveDays: currentDays,
    currentPhase: newPhase,
  });

  return {
    updated: true,
    previousPhase,
    currentPhase: newPhase,
    consecutiveDays: currentDays,
    canHarvest: currentDays >= AVOCADO_TOTAL_DAYS,
  };
}

/**
 * @param  {Object} params - Parametry funkcji
 * @param {string} params.userId - ID użytkownika
 * @return {Promise<{wasReset: boolean, hadPendingHarvest: boolean, previousDays: number}>} Obiekt zawierający informacje o resetowaniu wzrostu awokado
 */
export async function resetAvocadoGrowthInternal(params: { userId: string }): Promise<{
  wasReset: boolean;
  hadPendingHarvest: boolean;
  previousDays: number;
}> {
  const { userId } = params;

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const userData = userSnap.data() || {};
  const rawGrowth = userData.avocadoGrowth ?? {};
  const growth = AvocadoGrowthSchema.partial().parse(rawGrowth);

  const previousDays = growth.consecutiveDays || 0;
  const hadPendingHarvest = previousDays >= AVOCADO_TOTAL_DAYS;

  // Jeśli jest pending harvest, NIE resetujemy - użytkownik może jeszcze zebrać
  if (hadPendingHarvest) {
    return {
      wasReset: false,
      hadPendingHarvest: true,
      previousDays,
    };
  }

  // Resetuj wzrost
  await userRef.update({
    "avocadoGrowth.consecutiveDays": 0,
    "avocadoGrowth.currentPhase": 1,
    "avocadoGrowth.lastGrowthDate": null,
  });

  logger.info("Avocado growth reset", { userId, previousDays });

  return {
    wasReset: true,
    hadPendingHarvest: false,
    previousDays,
  };
}

/**
 * Pobiera status wzrostu awokado
 */
export const getAvocadoStatus = onCall(async (request) => {
  const parsedRequest = GetAvocadoStatusRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("getAvocadoStatus: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;

  try {
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userSnap.data() || {};
    const rawGrowth = userData.avocadoGrowth ?? {};
    const growth = AvocadoGrowthSchema.partial().parse(rawGrowth);

    const rawSettings = userData.settings ?? {};
    const settings = UserSettingsSchema.partial().parse(rawSettings);
    const rawDailyStats = userData.dailyStats ?? {};
    const dailyStats = UserDailyStatsSchema.partial().parse(rawDailyStats);

    const tz = settings.timeZone || "UTC";
    const nowLocal = new Date();
    const todayYmd = formatYmdInTimeZone(nowLocal, tz);

    const yesterdayDate = new Date(nowLocal);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayYmd = formatYmdInTimeZone(yesterdayDate, tz);

    const lastGrowthDate = growth.lastGrowthDate;
    const lastGrowthYmd = lastGrowthDate instanceof Date
      ? formatYmdInTimeZone(lastGrowthDate, tz)
      : null;

    // Sprawdź czy cel dzisiejszy spełniony
    const adminSettingsRef = db.doc("admin/settings");
    const adminSettingsSnap = await adminSettingsRef.get();
    const adminSettings = adminSettingsSnap.exists ? adminSettingsSnap.data() || {} : {};
    const threshold = (adminSettings.streakThreshold as number) || 50;

    const todayCount = (dailyStats.completedNewToday ?? 0) + (dailyStats.completedDueToday ?? 0);
    const goalMetToday = todayCount >= threshold;

    // Określ czy awokado jest "zwiędłe" (przegapiony dzień)
    const isWilted = !goalMetToday && lastGrowthYmd !== todayYmd && lastGrowthYmd !== yesterdayYmd && (growth.consecutiveDays || 0) > 0;

    // Określ czy można zbierać
    const canHarvest = (growth.consecutiveDays || 0) >= AVOCADO_TOTAL_DAYS;

    // Serializuj daty do ISO strings
    const serializedSkins = (growth.collectedSkins || []).map((skin: AvocadoSkin) => ({
      ...skin,
      obtainedAt: skin.obtainedAt instanceof Date ? skin.obtainedAt.toISOString() : skin.obtainedAt,
    }));

    const serializedHistory = (growth.harvestHistory || []).map((log: AvocadoHarvestLog) => ({
      ...log,
      harvestedAt: log.harvestedAt instanceof Date ? log.harvestedAt.toISOString() : log.harvestedAt,
    }));

    const rawResponse = {
      currentPhase: growth.currentPhase || 1,
      consecutiveDays: growth.consecutiveDays || 0,
      lastGrowthDate: lastGrowthYmd,
      totalHarvests: growth.totalHarvests || 0,
      collectedSkins: serializedSkins,
      harvestHistory: serializedHistory,
      canHarvest,
      isWilted,
      goalMetToday,
    };

    const validatedResponse = GetAvocadoStatusResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("getAvocadoStatus failed", error);
    handleZodError(error, "getAvocadoStatus");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get avocado status");
  }
});

/**
 * Zbiera dojrzałe awokado i losuje skórkę
 */
export const harvestAvocado = onCall(async (request) => {
  const parsedRequest = HarvestAvocadoRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("harvestAvocado: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const userId = auth.uid;

  try {
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userSnap.data() || {};
    const rawGrowth = userData.avocadoGrowth ?? {};
    const growth = AvocadoGrowthSchema.partial().parse(rawGrowth);

    // Sprawdź czy można zbierać
    const consecutiveDays = growth.consecutiveDays || 0;
    if (consecutiveDays < AVOCADO_TOTAL_DAYS) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot harvest yet. Days: ${consecutiveDays}/${AVOCADO_TOTAL_DAYS}`
      );
    }

    // Pobierz konfigurację i wylosuj skórkę
    const config = await getAvocadoConfig();
    const rolledSkin = rollGacha(config.skins);

    const now = new Date();

    // Sprawdź czy to nowa skórka
    const existingSkins = growth.collectedSkins || [];
    const isNewSkin = !existingSkins.some((s: AvocadoSkin) => s.id === rolledSkin.id);

    // Przygotuj nową skórkę
    const newSkin = {
      id: rolledSkin.id,
      name: rolledSkin.name,
      rarity: rolledSkin.rarity,
      obtainedAt: now,
    };

    // Przygotuj log zbioru
    const harvestLog = {
      skinId: rolledSkin.id,
      harvestedAt: now,
    };

    // Aktualizuj bazę danych
    const updates: Record<string, unknown> = {
      "avocadoGrowth.consecutiveDays": 0,
      "avocadoGrowth.currentPhase": 1,
      "avocadoGrowth.lastGrowthDate": null,
      "avocadoGrowth.totalHarvests": FieldValue.increment(1),
      "avocadoGrowth.harvestHistory": FieldValue.arrayUnion(harvestLog),
    };

    // Dodaj skórkę tylko jeśli jest nowa
    if (isNewSkin) {
      updates["avocadoGrowth.collectedSkins"] = FieldValue.arrayUnion(newSkin);
    }

    await userRef.update(updates);

    logger.info("Avocado harvested", {
      userId,
      skinId: rolledSkin.id,
      rarity: rolledSkin.rarity,
      isNewSkin,
    });

    const rawResponse = {
      success: true,
      awardedSkin: {
        ...newSkin,
        obtainedAt: now.toISOString(),
      },
      isNewSkin,
      totalHarvests: (growth.totalHarvests || 0) + 1,
    };

    const validatedResponse = HarvestAvocadoResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("harvestAvocado failed", error);
    handleZodError(error, "harvestAvocado");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to harvest avocado");
  }
});

/**
 * Pobiera konfigurację awokado (dla rozszerzalności)
 */
export const getAvocadoConfigFn = onCall(async (request) => {
  const parsedRequest = GetAvocadoConfigRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("getAvocadoConfig: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  try {
    const config = await getAvocadoConfig();
    return serializeTimestamps(config);
  } catch (error) {
    logger.error("getAvocadoConfig failed", error);
    handleZodError(error, "getAvocadoConfig");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get avocado config");
  }
});
