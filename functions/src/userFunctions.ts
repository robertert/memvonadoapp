import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  StudySessionCreateSchema,
  UserSettingsSchema,
  UserStatsSchema,
  SeasonUserPointsSchema,
  LeagueGroupSchema,
  type CardAlgo,
  type StudySessionCreate,
  type UserSettings,
  type SeasonUserPoints,
  type LeagueGroup,
  UserProgressSchema,
  UserSchema,
  CardSchema,
  CardGrade,
  Card,
  SuccessResponseSchema,
  GetUserDecksResponseSchema,
  DeckLearningDataSchema,
} from "./types/common";
import { z } from "zod";
import {
  UpdateUserStreakIfQualifiedRequestSchema,
  UpdateUserStreakIfQualifiedResponseSchema,
  UpdateUserStreakOnLoginRequestSchema,
  UpdateUserStreakOnLoginResponseSchema,
  GetUserDecksRequestSchema,
  UpdateCardProgressRequestSchema,
  GetUserProgressRequestSchema,
  GetUserProgressResponseSchema,
  GetUserSettingsRequestSchema,
  GetUserSettingsResponseSchema,
  GetUserProfileRequestSchema,
  GetUserProfileResponseSchema,
  GetUserActivityHeatmapRequestSchema,
  GetUserActivityHeatmapResponseSchema,
  GetUserAwardsRequestSchema,
  GetUserAwardsResponseSchema,
  SubmitPointsRequestSchema,
  SubmitPointsResponseSchema as ApiSubmitPointsResponseSchema,
  UpdateUserSettingsRequestSchema,
  ServerNowSchema,
  GetCurrentSeasonResponseSchema,
  WeeklyRollOverResponseSchema as ApiWeeklyRollOverResponseSchema,
  DeckLearningData,
  DailyStatsSchema,
  DailyStats,
  UndoCardRequestSchema,
  UndoCardResponseSchema,
} from "memvocado-types";
import { serializeTimestamps } from "./utils/serialization";

const DEFAULT_CARD_ALGO: CardAlgo = {
  difficulty: 2.5,
  scheduled_days: 1,
  due: new Date(),
  reps: 0,
  state: 0,
  stability: 0,
  elapsed_days: 0,
  lapses: 0,
};

const db = getFirestore();

const handleZodError = (error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    logger.error(`${context}: response validation failed`, error.errors);
    throw new HttpsError("internal", "Invalid response format");
  }
};

/**
 * Whitelistowane schematy do aktualizacji statystyk użytkownika.
 */
const UserStatsStreakUpdateSchema = UserStatsSchema.pick({
  currentStreak: true,
  longestStreak: true,
  lastStreakDate: true,
}).partial();

/**
 * Whitelist dla częściowych aktualizacji pól ligowych użytkownika.
 * Używany tam, gdzie aktualizujemy tylko league/currentGroupId.
 */
const UserLeagueUpdateSchema = UserSchema.pick({
  league: true,
  currentGroupId: true,
}).partial();

/**
 * Pomocniczo: formatuje datę na łańcuch w formacie YYYY-MM-DD w zadanej strefie czasowej.
 * @param {Date} date Data wejściowa w czasie UTC/systemowym
 * @param {string} timeZone Identyfikator strefy czasowej IANA, np. "Europe/Warsaw"
 * @return {string} Łańcuch daty w formacie YYYY-MM-DD dla kalendarzowego dnia w danej strefie
 */
function formatYmdInTimeZone(date: Date, timeZone: string): string {
  // en-CA daje format yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Wspólna logika aktualizacji streaka dla bieżącego dnia.
 * Jeśli liczba dzisiejszych sesji (w strefie użytkownika) >= progu, aktualizuje pola streaka.
 *
 * @param {Object} params
 * @param {string} params.userId Identyfikator użytkownika
 * @param {string} [params.timeZone] Strefa czasowa IANA (np. "Europe/Warsaw")
 * @param {number} [params.threshold=10] Dzienny próg liczby kart
 * @return {Promise<{qualified:boolean, updated:boolean, currentStreak:number, longestStreak:number, lastStreakDate:(string|null), threshold:number, todayCount:(number|undefined)}>}
 */
async function updateStreakForTodayIfQualified(params: {
  userId: string;
  timeZone?: string;
  threshold?: number;
}): Promise<{
  qualified: boolean;
  updated: boolean;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  threshold: number;
  todayCount: number | undefined;
}> {
  const { userId, timeZone, threshold } = params;
  const dailyThreshold: number =
    typeof threshold === "number" && threshold > 0 ? threshold : 10;

  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User not found");
  }

  const rawUser = userSnap.data() || {};
  const rawSettings = (rawUser as { settings?: unknown }).settings ?? {};
  const rawStats = (rawUser as { stats?: unknown }).stats ?? {};

  // Logika streaka wymaga poprawnych ustawień/timeZone oraz pól streaka.
  const settings = UserSettingsSchema.partial().parse(rawSettings);
  const stats = UserStatsSchema.partial().parse(rawStats);

  const tz: string = timeZone || settings.timeZone || "UTC";
  const nowLocal = new Date();
  const todayYmd = formatYmdInTimeZone(nowLocal, tz);

  const lastStreakDate = stats.lastStreakDate;
  const lastStreakYmd =
    lastStreakDate instanceof Date
      ? formatYmdInTimeZone(lastStreakDate, tz)
      : null;

  // Idempotencja – jeśli już zaliczony dzień, nic nie rób
  if (lastStreakYmd === todayYmd) {
    return {
      qualified: false,
      updated: false,
      currentStreak: Number(stats.currentStreak || 0),
      longestStreak: Number(stats.longestStreak || 0),
      lastStreakDate: lastStreakYmd,
      threshold: dailyThreshold,
      todayCount: undefined,
    };
  }

  // Zlicz dzisiejsze sesje (wyciągamy ~36h i filtrujemy po YYYY-MM-DD w strefie)
  const thirtySixHoursAgo = new Date(nowLocal.getTime() - 36 * 60 * 60 * 1000);
  const todaySessionsSnap = await db
    .collection(`users/${userId}/studySessions`)
    .where("reviewTime", ">=", thirtySixHoursAgo)
    .orderBy("reviewTime", "desc")
    .get();

  let todayCount = 0;
  todaySessionsSnap.docs.forEach((doc) => {
    const data = doc.data() as { reviewTime?: FirebaseFirestore.Timestamp };
    const ts = data.reviewTime;
    if (ts) {
      const ymd = formatYmdInTimeZone(ts.toDate(), tz);
      if (ymd === todayYmd) {
        todayCount += 1;
      }
    }
  });

  const qualified = todayCount >= dailyThreshold;
  if (!qualified) {
    return {
      qualified,
      updated: false,
      currentStreak: Number(stats.currentStreak || 0),
      longestStreak: Number(stats.longestStreak || 0),
      lastStreakDate: lastStreakYmd,
      threshold: dailyThreshold,
      todayCount,
    };
  }

  const current = Number(stats.currentStreak || 0);
  const longest = Number(stats.longestStreak || 0);
  const nextCurrent = current + 1;
  const nextLongest = Math.max(longest, nextCurrent);

  // Przechowujemy w bazie Date, a na wyjściu zwracamy string YYYY-MM-DD.
  const streakDateForStore = new Date(nowLocal);

  const safeStatsUpdate = UserStatsStreakUpdateSchema.parse({
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastStreakDate: streakDateForStore,
  });

  await userRef.update({
    "stats.currentStreak": safeStatsUpdate.currentStreak,
    "stats.longestStreak": safeStatsUpdate.longestStreak,
    "stats.lastStreakDate": safeStatsUpdate.lastStreakDate,
  });

  return {
    qualified: true,
    updated: true,
    currentStreak: nextCurrent,
    longestStreak: nextLongest,
    lastStreakDate: formatYmdInTimeZone(streakDateForStore, tz),
    threshold: dailyThreshold,
    todayCount,
  };
}

/**
 * Aktualizuje streak użytkownika „na żądanie” przy starcie aplikacji.
 * Bazuje na tym, czy wczoraj (w strefie czasowej użytkownika) była jakakolwiek sesja.
 * Idempotentne dzięki polu stats.lastStreakDate (YYYY-MM-DD).
 */
export const updateUserStreakOnLogin = onCall(async (request) => {
  const parsedRequest = UpdateUserStreakOnLoginRequestSchema.safeParse(
    request.data
  );
  if (!parsedRequest.success) {
    logger.error("updateUserStreakOnLogin: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  try {
    const { userId, timeZone } = parsedRequest.data;

    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const userData = UserSchema.parse({
      id: userSnap.id,
      ...userSnap.data(),
    });

    const tz: string = timeZone || userData.settings.timeZone || "UTC";

    // YYYY-MM-DD dla wczoraj w strefie użytkownika
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYmd = formatYmdInTimeZone(yesterday, tz);

    // Jeżeli już zaktualizowane dla wczoraj, nic nie rób (idempotencja)
    const lastStreakDate = userData.stats.lastStreakDate;
    const lastStreakYmd =
      lastStreakDate instanceof Date
        ? formatYmdInTimeZone(lastStreakDate, tz)
        : null;

    if (lastStreakYmd === yesterdayYmd) {
      return serializeTimestamps({
        currentStreak: Number(userData.stats.currentStreak || 0),
        longestStreak: Number(userData.stats.longestStreak || 0),
        lastStreakDate: lastStreakYmd || formatYmdInTimeZone(new Date(), tz),
        updated: false,
      });
    }

    // Pobierz sesje z ostatnich 48h i sprawdź, czy którakolwiek ma reviewTime przypadający na wczoraj w danej strefie
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const sessionsSnap = await db
      .collection(`users/${userId}/studySessions`)
      .where("reviewTime", ">=", twoDaysAgo)
      .orderBy("reviewTime", "desc")
      .get();

    let hadStudyYesterday = false;
    sessionsSnap.docs.some((doc) => {
      const data = doc.data() as { reviewTime?: FirebaseFirestore.Timestamp };
      const ts = data.reviewTime;
      if (ts) {
        const ymd = formatYmdInTimeZone(ts.toDate(), tz);
        if (ymd === yesterdayYmd) {
          hadStudyYesterday = true;
          return true;
        }
      }
      return false;
    });

    const current = Number(userData.stats.currentStreak || 0);
    const longest = Number(userData.stats.longestStreak || 0);

    const nextCurrent = hadStudyYesterday ? current + 1 : 0;
    const nextLongest = hadStudyYesterday
      ? Math.max(longest, nextCurrent)
      : longest;

    const safeStatsUpdate = UserStatsStreakUpdateSchema.parse({
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastStreakDate: yesterday,
    });

    await userRef.update({
      "stats.currentStreak": safeStatsUpdate.currentStreak,
      "stats.longestStreak": safeStatsUpdate.longestStreak,
      "stats.lastStreakDate": safeStatsUpdate.lastStreakDate,
    });

    const rawResponse = {
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastStreakDate: yesterdayYmd,
      updated: true,
    };

    const validatedResponse =
      UpdateUserStreakOnLoginResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("updateUserStreakOnLogin failed", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update streak");
  }
});

/**
 * Aktualizuje streak natychmiast po spełnieniu progu dziennego
 * (np. 10 kart w danym dniu). Jeżeli użytkownik już ma zapisany
 * stats.lastStreakDate == dzisiaj (w jego strefie), nie robi nic.
 * Liczy liczbę sesji przypadających na dzisiejszy dzień w strefie
 * i gdy osiągnie próg, inkrementuje streak i zapisuje lastStreakDate.
 *
 * request.data: { userId: string, timeZone?: string, threshold?: number }
 */
export const updateUserStreakIfQualified = onCall(async (request) => {
  const parsedRequest = UpdateUserStreakIfQualifiedRequestSchema.safeParse(
    request.data
  );
  if (!parsedRequest.success) {
    logger.error("updateUserStreakIfQualified: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }
  try {
    const { userId, timeZone, threshold } = parsedRequest.data;

    const streakResult = await updateStreakForTodayIfQualified({
      userId,
      timeZone,
      threshold,
    });
    const validatedResponse =
      UpdateUserStreakIfQualifiedResponseSchema.parse(streakResult);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("updateUserStreakIfQualified failed", error);
    if (error instanceof z.ZodError) {
      logger.error("Response validation failed", error.errors);
      throw new HttpsError("internal", "Invalid response format");
    }
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update streak by threshold");
  }
});

/**
 * Get user decks with cards
 */
export const getUserDecks = onCall(async (request) => {
  const parsedRequest = GetUserDecksRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("getUserDecks: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    // Get decks created by user (from main decks collection)
    const decksSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("decks")
      .get();

    const decks: DeckLearningData[] = decksSnapshot.docs.map((deckDoc) => ({
      id: deckDoc.id,
      ...deckDoc.data(),
    })) as DeckLearningData[];

    const validatedDecks: DeckLearningData[] = decks.map((deck) =>
      DeckLearningDataSchema.parse(deck)
    );

    const rawResponse = { decks: validatedDecks };
    const validatedResponse = GetUserDecksResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user decks", error);
    handleZodError(error, "getUserDecks");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user decks");
  }
});

export const undoCard = onCall(async (request) => {
  const parsedRequest = UndoCardRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("undoCard: invalid request", {
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
    const { deckId, card, dailyStats } = parsedRequest.data;

    const validatedCard = CardSchema.parse(card);

    const cardRef = db.doc(
      `users/${userId}/decks/${deckId}/cards/${validatedCard.id}`
    );
    await cardRef.set(validatedCard);

    // Update daily stats
    await updateDailyStats(userId, deckId, dailyStats);

    // Delete study session
    const studySessionRef = await db
      .collection(`users/${userId}/studySessions`)
      .where("cardId", "==", validatedCard.id)
      .limit(1)
      .get();
    if (studySessionRef.docs.length > 0) {
      await studySessionRef.docs[0].ref.delete();
    }

    const successResponse = UndoCardResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error undoing card", error);
    handleZodError(error, "undoCard");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to undo card");
  }
});

/**
 * Update daily stats
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {DailyStats | undefined} dailyStats - Daily stats
 * @return {Promise<void>}
 */
async function updateDailyStats(
  userId: string,
  deckId: string,
  dailyStats: DailyStats | undefined
) {
  try {
    const deckRef = db.doc(`users/${userId}/decks/${deckId}`);

    const userRef = db.doc(`users/${userId}`);

    if (dailyStats) {
      const deckData = await deckRef.get();

      const dailyStatsBefore = deckData.data()?.dailyStats;

      const validatedDailyStatsBefore =
        DailyStatsSchema.parse(dailyStatsBefore);

      const validatedDailyStats = DailyStatsSchema.parse(dailyStats);

      const completedNewDiff =
        validatedDailyStats.completedNewToday -
        validatedDailyStatsBefore.completedNewToday;
      const completedDueDiff =
        validatedDailyStats.completedDueToday -
        validatedDailyStatsBefore.completedDueToday;

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
  } catch (statsErr) {
    logger.warn("updateCardProgress: daily stats update failed", statsErr);
    // Nie przerywaj głównej operacji – to tylko best-effort
  }
}

/**
 * Update card progress after review
 */
export const updateCardProgress = onCall(async (request) => {
  const parsedRequest = UpdateCardProgressRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("updateCardProgress: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, deckId, card, scheduledTime, dailyStats } =
    parsedRequest.data;

  const validatedCard = CardSchema.parse(card);

  try {
    const cardRef = db.doc(
      `users/${userId}/decks/${deckId}/cards/${validatedCard.id}`
    );

    const now = Date.now();

    let cardUpdateData: Card;
    if (validatedCard.firstLearn?.isFirst) {
      cardUpdateData = CardSchema.parse({
        ...validatedCard,
        firstLearn: {
          ...validatedCard.firstLearn,
          due: new Date(now + scheduledTime),
        },
      });
    } else {
      cardUpdateData = {
        ...validatedCard,
        cardAlgo: {
          ...(validatedCard.cardAlgo ?? DEFAULT_CARD_ALGO),
          due: new Date(now + scheduledTime),
        },
      };
    }

    const validatedCardUpdateData = CardSchema.parse(cardUpdateData);

    // Use set with merge to create if doesn't exist, update if exists
    await cardRef.set(validatedCardUpdateData, { merge: true });

    // Waliduj i typuj study session przed zapisem
    const studySession: StudySessionCreate = StudySessionCreateSchema.parse({
      deckId,
      cardId: validatedCard.id,
      grade: validatedCard.grade ?? CardGrade.NotGraded,
      reviewTime: new Date(),
    });

    // Log study session
    await db.collection(`users/${userId}/studySessions`).add(studySession);

    // Aktualizacja statystyk dziennych
    await updateDailyStats(userId, deckId, dailyStats);

    // Po zapisaniu sesji: sprawdź wspólną logiką, czy dzienny próg (10 kart) został osiągnięty
    try {
      await updateStreakForTodayIfQualified({ userId });
    } catch (streakErr) {
      logger.warn(
        "updateCardProgress: streak threshold check failed",
        streakErr
      );
      // Nie przerywaj głównej operacji – to tylko best-effort
    }

    logger.info("Card progress updated successfully", {
      userId,
      deckId,
      cardId: validatedCard.id,
      grade: validatedCard.grade ?? CardGrade.NotGraded,
      firstLearn: validatedCard.firstLearn,
    });

    const successResponse = SuccessResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error updating card progress", error);
    handleZodError(error, "updateCardProgress");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update card progress");
  }
});

/**
 * Get user progress and statistics
 */
export const getUserProgress = onCall(async (request) => {
  const parsedRequest = GetUserProgressRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserProgress: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const userData = UserSchema.parse(userDoc.data());

    // Get recent study sessions
    const recentSessions = await db
      .collection(`users/${userId}/studySessions`)
      .orderBy("reviewTime", "desc")
      .limit(10)
      .get();

    const sessions = recentSessions.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userProgress = UserProgressSchema.parse({
      stats: userData.stats || {},
      recentSessions: sessions,
      dailyGoal: userData.settings?.dailyGoal ?? undefined,
    });
    const rawResponse = { userProgress };
    const validatedResponse = GetUserProgressResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user progress", error);
    handleZodError(error, "getUserProgress");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user progress");
  }
});
/**
 * Get user settings
 */
export const getUserSettings = onCall(async (request) => {
  const parsedRequest = GetUserSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserSettings: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    // Try a dedicated settings doc first: users/{userId}/settings/app
    const settingsDocPath = db.doc(`users/${userId}/settings/app`);
    const settingsDoc = await settingsDocPath.get();

    logger.info("settingsDoc", { settingsDoc });

    if (settingsDoc.exists) {
      const settingsFromDoc = (settingsDoc.data() || {}) as unknown;
      const validatedSettings = UserSettingsSchema.parse(settingsFromDoc);
      const rawResponse = { settings: validatedSettings };
      const validatedResponse =
        GetUserSettingsResponseSchema.parse(rawResponse);
      return serializeTimestamps(validatedResponse);
    }

    // Fallback: settings embedded in user root document under `settings`
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return serializeTimestamps({ settings: {} });
    }
    const userData = UserSchema.parse({
      id: userDoc.id,
      ...userDoc.data(),
    });

    // Get settings from user document
    // validateUserData sets theme: "light" at root level, not in settings object
    // So if we have userData.settings, it was explicitly set by user
    const userSettings = userData.settings;
    if (
      userSettings &&
      typeof userSettings === "object" &&
      Object.keys(userSettings).length > 0
    ) {
      const validatedSettings = UserSettingsSchema.parse(userSettings);
      const rawResponse = { settings: validatedSettings };
      const validatedResponse =
        GetUserSettingsResponseSchema.parse(rawResponse);
      return serializeTimestamps(validatedResponse);
    }

    // No settings found – return defaults
    const validatedSettings = UserSettingsSchema.parse({});
    const rawResponse = { settings: validatedSettings };
    const validatedResponse = GetUserSettingsResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user settings", error);
    handleZodError(error, "getUserSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user settings");
  }
});

/**
 * Return server authoritative time and optional active season info
 */
export const serverNow = onCall(async () => {
  const now = new Date();
  const rawResponse = {
    nowMs: now.getTime(),
    iso: now.toISOString(),
  };

  try {
    const validatedResponse = ServerNowSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    handleZodError(error, "serverNow");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get server time");
  }
});

/**
 * Get or initialize current season (weekly windows, server-defined)
 * Collection: ranking/currentSeason
 */
export const getCurrentSeason = onCall(async () => {
  const seasonRef = db.doc("ranking/currentSeason");
  const snap = await seasonRef.get();

  const computeWindow = () => {
    const now = new Date();
    // Start of current week (Mon 00:00 UTC)
    const day = now.getUTCDay();
    const diffToMonday = (day + 6) % 7; // 0 for Monday
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    start.setUTCDate(start.getUTCDate() - diffToMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const seasonId = `${start.toISOString().slice(0, 10)}_${end
      .toISOString()
      .slice(0, 10)}`;
    return { seasonId, startAt: start, endAt: end, status: "active" } as const;
  };

  try {
    if (!snap.exists) {
      const window = computeWindow();
      await seasonRef.set({
        ...window,
        createdAt: FieldValue.serverTimestamp(),
      });
      const validatedResponse = GetCurrentSeasonResponseSchema.parse(window);
      return serializeTimestamps(validatedResponse);
    }

    const data = snap.data() as {
      seasonId: string;
      startAt: unknown;
      endAt: unknown;
      status: string;
    };
    const validatedResponse = GetCurrentSeasonResponseSchema.parse(data);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting current season", error);
    handleZodError(error, "getCurrentSeason");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get current season");
  }
});

/**
 * Submit points for current season (authoritative, server-timestamped)
 * Request: { userId: string; delta: number }
 */
export const submitPoints = onCall(async (request) => {
  const parsedRequest = SubmitPointsRequestSchema.safeParse(request.data || {});
  if (!parsedRequest.success) {
    logger.error("submitPoints: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }
  try {
    const { userId, delta } = parsedRequest.data;

    // Call local function directly to avoid nested onCall.run typing
    const seasonSnap = await db.doc("ranking/currentSeason").get();
    let seasonId: string | undefined;
    if (seasonSnap.exists) {
      const parsedSeason = GetCurrentSeasonResponseSchema.pick({
        seasonId: true,
      }).safeParse(seasonSnap.data() || {});
      if (!parsedSeason.success) {
        logger.error("submitPoints: invalid currentSeason document", {
          issues: parsedSeason.error.issues,
        });
        throw new HttpsError("internal", "Invalid current season data");
      }
      seasonId = parsedSeason.data.seasonId;
    } else {
      // initialize if missing
      const now = new Date();
      const day = now.getUTCDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      start.setUTCDate(start.getUTCDate() - diffToMonday);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      seasonId = `${start.toISOString().slice(0, 10)}_${end
        .toISOString()
        .slice(0, 10)}`;
      const seasonWindow = {
        seasonId,
        startAt: start,
        endAt: end,
        status: "active",
      };
      // Walidacja całego okna sezonu zanim trafi do bazy
      GetCurrentSeasonResponseSchema.parse(seasonWindow);
      await seasonSnap.ref.set({
        ...seasonWindow,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (!seasonId) {
      throw new HttpsError("failed-precondition", "No active season");
    }

    const docRef = db.doc(`seasonUserPoints/${seasonId}/users/${userId}`);

    // Get user's current data to determine league and check for group
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.exists ? userDoc.data() || {} : {};
    const userSeasonPoints = await docRef.get();
    const seasonData = userSeasonPoints.exists
      ? SeasonUserPointsSchema.partial().parse(userSeasonPoints.data() || {})
      : {};
    const userLeague =
      seasonData.league ??
      (typeof (userData as { league?: unknown }).league === "number"
        ? ((userData as { league?: number }).league as number)
        : 1);
    let groupId = seasonData.groupId;

    // Assign to group if needed (before transaction)
    if (!groupId) {
      const groupsRef = db
        .collection("leagueGroups")
        .doc(`${seasonId}_${userLeague}`)
        .collection("groups");
      const allGroupsSnapshot = await groupsRef.get();

      let targetGroupId: string | null = null;

      // Find first group with capacity
      for (const groupDoc of allGroupsSnapshot.docs) {
        const groupData = groupDoc.data() as {
          currentCount?: number;
          isFull?: boolean;
          capacity?: number;
        };

        const currentCount = groupData?.currentCount ?? 0;
        const capacity = groupData?.capacity ?? 20;
        const isFull = groupData?.isFull ?? false;

        if (!isFull && currentCount < capacity) {
          targetGroupId = groupDoc.id;
          break;
        }
      }

      // If no group found, create a new one
      if (!targetGroupId) {
        const newGroupRef = groupsRef.doc();
        targetGroupId = newGroupRef.id;

        // Waliduj i typuj LeagueGroup przed zapisem (bez createdAt - użyjemy FieldValue)
        const leagueGroupData: Omit<LeagueGroup, "createdAt" | "id"> = {
          isFull: false,
          capacity: 20,
          currentCount: 0,
          leagueNumber: userLeague,
        };
        LeagueGroupSchema.omit({ createdAt: true, id: true }).parse(
          leagueGroupData
        );

        // Create group before transaction
        await newGroupRef.set({
          ...leagueGroupData,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      groupId = targetGroupId;
    }

    // Now run transaction to update points and group membership atomically
    await db.runTransaction(async (trx) => {
      // All reads must happen before any writes
      const snap = await trx.get(docRef);
      const prev = snap.exists
        ? SeasonUserPointsSchema.partial().parse(snap.data() || {})
        : {};
      const nextPoints = (prev.points || 0) + delta;

      // Read group document if this is a new assignment (must be before writes)
      let groupDoc = null;
      if (!prev.groupId && groupId) {
        const groupRef = db
          .collection("leagueGroups")
          .doc(`${seasonId}_${userLeague}`)
          .collection("groups")
          .doc(groupId);
        groupDoc = await trx.get(groupRef);
      }

      // Now all writes can happen
      // Waliduj i typuj season user points (bez lastActivityAt - użyjemy FieldValue)
      const seasonUserPointsData: Omit<SeasonUserPoints, "lastActivityAt"> = {
        points: nextPoints,
        league: userLeague,
        groupId: groupId,
      };
      // Walidacja częściowa (bez lastActivityAt)
      SeasonUserPointsSchema.omit({ lastActivityAt: true }).parse(
        seasonUserPointsData
      );

      // Update season user points
      trx.set(
        docRef,
        {
          ...seasonUserPointsData,
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Update user document (partial update – z whitelistą pól)
      const safeUserLeagueUpdate = UserLeagueUpdateSchema.parse({
        currentGroupId: groupId,
        league: userLeague,
      });
      trx.update(db.doc(`users/${userId}`), safeUserLeagueUpdate);

      // Update group member points
      const memberRef = db
        .collection("leagueGroups")
        .doc(`${seasonId}_${userLeague}`)
        .collection("groups")
        .doc(groupId)
        .collection("members")
        .doc(userId);

      // Waliduj dane członka grupy (bez id i username - to są opcjonalne w members collection)
      const memberData = {
        userId,
        points: nextPoints,
      };
      // Sprawdź tylko wymagane pola
      if (memberData.points < 0) {
        throw new HttpsError("invalid-argument", "Points cannot be negative");
      }

      trx.set(
        memberRef,
        {
          ...memberData,
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // If this is a new group assignment, update group count
      if (!prev.groupId && groupId && groupDoc) {
        if (groupDoc.exists) {
          const rawGroupData = groupDoc.data() || {};
          const currentCount =
            (rawGroupData as { currentCount?: number }).currentCount ?? 0;
          const capacity =
            (rawGroupData as { capacity?: number }).capacity ?? 20;
          const newCount = currentCount + 1;
          const groupRefForUpdate = db
            .collection("leagueGroups")
            .doc(`${seasonId}_${userLeague}`)
            .collection("groups")
            .doc(groupId);

          trx.update(groupRefForUpdate, {
            currentCount: newCount,
            isFull: newCount >= capacity,
          });
        }
      }
    });

    logger.info("Points submitted", { userId, delta, seasonId, groupId });
    const rawResponse = { success: true };
    const validatedResponse = ApiSubmitPointsResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    handleZodError(error, "submitPoints");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to submit points");
  }
});

/**
 * Close current season and publish simple leaderboard snapshot
 * For production, consider Cloud Scheduler to call this weekly.
 */
export const weeklyRollOver = onCall(async () => {
  const seasonDoc = await db.doc("ranking/currentSeason").get();
  if (!seasonDoc.exists) {
    throw new HttpsError("failed-precondition", "No current season");
  }
  const { seasonId, endAt } = GetCurrentSeasonResponseSchema.pick({
    seasonId: true,
    endAt: true,
  }).parse(seasonDoc.data() || {});

  const now = new Date();
  if (endAt && now < endAt) {
    // Not yet ended, but allow manual publish
    logger.warn("weeklyRollOver called before season end", { seasonId });
  }

  // Build leaderboard (global, top 100)
  const usersSnap = await db
    .collection(`seasonUserPoints/${seasonId}/users`)
    .orderBy("points", "desc")
    .limit(100)
    .get();

  const entries = usersSnap.docs.map((d, idx) => {
    const data = d.data() as { points?: number; lastActivityAt?: unknown };
    return {
      userId: d.id,
      points: data.points ?? 0,
      lastActivityAt: data.lastActivityAt ?? null,
      position: idx + 1,
    };
  });

  await db.doc(`leaderboards/${seasonId}/groups/global`).set(
    {
      entries,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Initialize next season window
  const end = endAt || new Date();
  const nextStart = new Date(end);
  const nextEnd = new Date(nextStart);
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 7);
  const nextId = `${nextStart.toISOString().slice(0, 10)}_${nextEnd
    .toISOString()
    .slice(0, 10)}`;

  await seasonDoc.ref.set(
    {
      seasonId: nextId,
      startAt: nextStart,
      endAt: nextEnd,
      status: "active",
      rolledAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    logger.info("Season rolled over", { prev: seasonId, next: nextId });
    const rawResponse = { success: true, nextSeasonId: nextId };
    const validatedResponse =
      ApiWeeklyRollOverResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    handleZodError(error, "weeklyRollOver");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to roll over season");
  }
});

/**
 * Update user settings
 */
export const updateUserSettings = onCall(async (request) => {
  const parsedRequest = UpdateUserSettingsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("updateUserSettings: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, settings } = parsedRequest.data;

  try {
    const validatedSettings: UserSettings = UserSettingsSchema.parse(settings);

    // Update dedicated settings doc: users/{userId}/settings/app
    const settingsDocPath = db.doc(`users/${userId}/settings/app`);
    await settingsDocPath.set(validatedSettings, { merge: true });

    logger.info("User settings updated", { userId });

    const successResponse = SuccessResponseSchema.parse({ success: true });
    return serializeTimestamps(successResponse);
  } catch (error) {
    logger.error("Error updating user settings", error);
    handleZodError(error, "updateUserSettings");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update user settings");
  }
});

/**
 * Get user profile with full information
 */
export const getUserProfile = onCall(async (request) => {
  const parsedRequest = GetUserProfileRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserProfile: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const userDoc = await db.doc(`users/${userId}`).get();

    if (!userDoc.exists) {
      logger.error("User not found", { userId });
      throw new HttpsError("not-found", "User not found");
    }

    const rawUser = {
      id: userDoc.id,
      ...(userDoc.data() || {}),
    } as unknown;

    const validatedUser = UserSchema.parse(rawUser);
    const response = GetUserProfileResponseSchema.parse(validatedUser);
    return serializeTimestamps(response);
  } catch (error) {
    logger.error("Error getting user profile", error);
    handleZodError(error, "getUserProfile");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user profile");
  }
});

/**
 * Get user activity heatmap data
 */
export const getUserActivityHeatmap = onCall(async (request) => {
  const parsedRequest = GetUserActivityHeatmapRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserActivityHeatmap: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId, weeks = 16 } = parsedRequest.data;

  try {
    const today = new Date();
    const days = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    // Get study sessions in the date range
    const sessionsRef = db
      .collection(`users/${userId}/studySessions`)
      .where("date", ">=", startDate);

    const sessionsSnapshot = await sessionsRef.get();

    // Count sessions per day
    const activityMap: Record<string, number> = {};

    sessionsSnapshot.docs.forEach((doc) => {
      const sessionData = doc.data();
      const sessionDate = sessionData.date?.toDate
        ? sessionData.date.toDate()
        : new Date(sessionData.date);

      if (isNaN(sessionDate.getTime())) {
        return;
      }

      const dateKey = sessionDate.toISOString().slice(0, 10); // YYYY-MM-DD
      activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    });

    // Generate heatmap data for all days in range
    const heatmapData: Array<{ date: string; count: number }> = [];

    // Generate exactly 'days' days ending with today
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      dt.setHours(0, 0, 0, 0);
      const iso = dt.toISOString().slice(0, 10);
      heatmapData.push({
        date: iso,
        count: activityMap[iso] || 0,
      });
    }

    const rawResponse = { heatmapData };
    const validatedResponse =
      GetUserActivityHeatmapResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user activity heatmap", error);
    handleZodError(error, "getUserActivityHeatmap");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user activity heatmap");
  }
});

/**
 * Get user awards
 */
export const getUserAwards = onCall(async (request) => {
  const parsedRequest = GetUserAwardsRequestSchema.safeParse(
    request.data || {}
  );
  if (!parsedRequest.success) {
    logger.error("getUserAwards: invalid request", {
      issues: parsedRequest.error.issues,
    });
    throw new HttpsError("invalid-argument", "Invalid request data", {
      issues: parsedRequest.error.issues,
    });
  }

  const { userId } = parsedRequest.data;

  try {
    const awardsRef = db
      .collection(`users/${userId}/awards`)
      .orderBy("earnedAt", "desc");

    const awardsSnapshot = await awardsRef.get();

    const awards = awardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const rawResponse = { awards };
    const validatedResponse = GetUserAwardsResponseSchema.parse(rawResponse);
    return serializeTimestamps(validatedResponse);
  } catch (error) {
    logger.error("Error getting user awards", error);
    handleZodError(error, "getUserAwards");
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to get user awards");
  }
});
