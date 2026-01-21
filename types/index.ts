/**
 * Centralny eksport typów i funkcji walidacji
 *
 * Ten plik eksportuje wszystkie typy TypeScript wygenerowane z schematów Zod
 * oraz funkcje pomocnicze do walidacji danych w runtime.
 */

// Eksport wszystkich schematów
export * from "./schemas/index";

// Re-eksport typów dla wygody
import type {
  User,
  UserCore,
  UserStats,
  UserSettings,
  Card,
  CardCore,
  CardData,
  CardAlgo,
  FirstLearn,
  Deck,
  DeckCore,
  DeckSettings,
  DeckLearningData,
  DeckLearningCore,
  DailyStats,
  StudySession,
  Notification,
  Season,
  SeasonUserPoints,
  LeagueGroup,
  LeagueGroupMember,
  SearchFilters,
  SearchLog,
  UserProgress,
  SuperMemoResult,
  CardChangeWithType,
  // Partial update types
  DeckCoreUpdate,
  DeckSettingsUpdate,
  DeckUpdate,
  DeckLearningDataUpdate,
  CardDataUpdate,
  CardCoreUpdate,
  CardAlgoUpdate,
  FirstLearnUpdate,
  CardLearningUpdate,
  CardUpdate,
  // Avocado types
  AvocadoSkinRarity,
  AvocadoSkin,
  AvocadoHarvestLog,
  AvocadoGrowth,
  AvocadoGrowthUpdate,
  AvocadoSkinConfig,
  AvocadoConfig,
  GetAvocadoStatusRequest,
  GetAvocadoStatusResponse,
  HarvestAvocadoRequest,
  HarvestAvocadoResponse,
  GetAvocadoConfigRequest,
  GetAvocadoConfigResponse,
} from "./schemas/index";

// Re-eksport schematów do walidacji
import {
  UserSchema,
  UserCoreSchema,
  UserStatsSchema,
  UserSettingsSchema,
  CardSchema,
  CardCoreSchema,
  CardDataSchema,
  CardAlgoSchema,
  FirstLearnSchema,
  DeckSchema,
  DeckCoreSchema,
  DeckSettingsSchema,
  DeckLearningDataSchema,
  DeckLearningCoreSchema,
  StudySessionSchema,
  NotificationSchema,
  SeasonSchema,
  SeasonUserPointsSchema,
  LeagueGroupSchema,
  LeagueGroupMemberSchema,
  SearchFiltersSchema,
  SearchLogSchema,
  UserProgressSchema,
  SuperMemoResultSchema,
  CardChangeWithTypeSchema,
  // Partial update schemas
  DeckCoreUpdateSchema,
  DeckSettingsUpdateSchema,
  DeckUpdateSchema,
  DeckLearningDataUpdateSchema,
  CardDataUpdateSchema,
  CardCoreUpdateSchema,
  CardAlgoUpdateSchema,
  FirstLearnUpdateSchema,
  CardLearningUpdateSchema,
  CardUpdateSchema,
  // Avocado schemas
  AvocadoSkinSchema,
  AvocadoHarvestLogSchema,
  AvocadoGrowthSchema,
  AvocadoGrowthUpdateSchema,
  AvocadoSkinConfigSchema,
  AvocadoConfigSchema,
  GetAvocadoStatusRequestSchema,
  GetAvocadoStatusResponseSchema,
  HarvestAvocadoRequestSchema,
  HarvestAvocadoResponseSchema,
  GetAvocadoConfigRequestSchema,
  GetAvocadoConfigResponseSchema,
} from "./schemas/index";

// ============================================================================
// Funkcje walidacji
// ============================================================================

/**
 * Waliduje dane użytkownika (core)
 */
export function safeValidateUserCore(
  data: unknown
): { success: true; data: UserCore } | { success: false; error: any } {
  const result = UserCoreSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje pełne dane użytkownika
 */
export function safeValidateUser(
  data: unknown
): { success: true; data: User } | { success: false; error: any } {
  const result = UserSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje dane karty (core)
 */
export function safeValidateCardCore(
  data: unknown
): { success: true; data: CardCore } | { success: false; error: any } {
  const result = CardCoreSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje pełne dane karty
 */
export function safeValidateCard(
  data: unknown
): { success: true; data: Card } | { success: false; error: any } {
  const result = CardSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje dane talii (core)
 */
export function safeValidateDeckCore(
  data: unknown
): { success: true; data: DeckCore } | { success: false; error: any } {
  const result = DeckCoreSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje pełne dane talii
 */
export function safeValidateDeck(
  data: unknown
): { success: true; data: Deck } | { success: false; error: any } {
  const result = DeckSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje dane talii użytkownika (core)
 */
export function safeValidateDeckLearningCore(
  data: unknown
): { success: true; data: DeckLearningCore } | { success: false; error: any } {
  const result = DeckLearningCoreSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje pełne dane talii użytkownika
 */
export function safeValidateDeckLearningData(
  data: unknown
): { success: true; data: DeckLearningData } | { success: false; error: any } {
  const result = DeckLearningDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje dodatkowe struktury wspierające
 */
export function safeValidateUserStats(
  data: unknown
): { success: true; data: UserStats } | { success: false; error: any } {
  const result = UserStatsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateUserSettings(
  data: unknown
): { success: true; data: UserSettings } | { success: false; error: any } {
  const result = UserSettingsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateCardData(
  data: unknown
): { success: true; data: CardData } | { success: false; error: any } {
  const result = CardDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateCardAlgo(
  data: unknown
): { success: true; data: CardAlgo } | { success: false; error: any } {
  const result = CardAlgoSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateFirstLearn(
  data: unknown
): { success: true; data: FirstLearn } | { success: false; error: any } {
  const result = FirstLearnSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateDeckSettings(
  data: unknown
): { success: true; data: DeckSettings } | { success: false; error: any } {
  const result = DeckSettingsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateStudySession(
  data: unknown
): { success: true; data: StudySession } | { success: false; error: any } {
  const result = StudySessionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateNotification(
  data: unknown
): { success: true; data: Notification } | { success: false; error: any } {
  const result = NotificationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSeason(
  data: unknown
): { success: true; data: Season } | { success: false; error: any } {
  const result = SeasonSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSeasonUserPoints(
  data: unknown
): { success: true; data: SeasonUserPoints } | { success: false; error: any } {
  const result = SeasonUserPointsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateLeagueGroup(
  data: unknown
): { success: true; data: LeagueGroup } | { success: false; error: any } {
  const result = LeagueGroupSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateLeagueGroupMember(
  data: unknown
): { success: true; data: LeagueGroupMember } | { success: false; error: any } {
  const result = LeagueGroupMemberSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSearchFilters(
  data: unknown
): { success: true; data: SearchFilters } | { success: false; error: any } {
  const result = SearchFiltersSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSearchLog(
  data: unknown
): { success: true; data: SearchLog } | { success: false; error: any } {
  const result = SearchLogSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateUserProgress(
  data: unknown
): { success: true; data: UserProgress } | { success: false; error: any } {
  const result = UserProgressSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateSuperMemoResult(
  data: unknown
): { success: true; data: SuperMemoResult } | { success: false; error: any } {
  const result = SuperMemoResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateCardChangeWithType(
  data: unknown
):
  | { success: true; data: CardChangeWithType }
  | { success: false; error: any } {
  const result = CardChangeWithTypeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje tablicę danych używając podanego schematu
 */
export function validateArray<T>(
  data: unknown,
  schema: { parse: (data: unknown) => T }
): T[] {
  if (!Array.isArray(data)) {
    throw new Error("Expected an array");
  }
  return data.map((item) => schema.parse(item));
}

/**
 * Waliduje tablicę danych (bez rzucania błędu)
 */
export function safeValidateArray<T>(
  data: unknown,
  schema: {
    safeParse: (data: unknown) => { success: boolean; data?: T; error?: any };
  }
): { success: true; data: T[] } | { success: false; error: any } {
  if (!Array.isArray(data)) {
    return { success: false, error: new Error("Expected an array") };
  }

  const results = data.map((item) => schema.safeParse(item));
  const errors = results.filter((r) => !r.success);

  if (errors.length > 0) {
    return { success: false, error: errors[0].error };
  }

  return { success: true, data: results.map((r) => r.data as T) };
}

/**
 * Konwertuje dane z Firestore (z timestampami) na typy JavaScript
 * Firestore zwraca Timestamp zamiast Date, więc trzeba je przekonwertować
 */
export function convertFirestoreData<T>(data: any): T {
  // Rekurencyjnie konwertuj Timestamp na Date
  const convertValue = (value: any): any => {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    // Firestore Timestamp
    if (value && typeof value.toDate === "function") {
      return value.toDate();
    }

    // Tablica
    if (Array.isArray(value)) {
      return value.map(convertValue);
    }

    // Obiekt
    if (typeof value === "object") {
      const converted: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          converted[key] = convertValue(value[key]);
        }
      }
      return converted;
    }

    return value;
  };

  return convertValue(data) as T;
}

// ============================================================================
// Funkcje walidacji dla częściowych update'ów
// ============================================================================

/**
 * Waliduje częściową aktualizację danych talii (core)
 */
export function safeValidateDeckCoreUpdate(
  data: unknown
): { success: true; data: DeckCoreUpdate } | { success: false; error: any } {
  const result = DeckCoreUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację ustawień talii
 */
export function safeValidateDeckSettingsUpdate(
  data: unknown
):
  | { success: true; data: DeckSettingsUpdate }
  | { success: false; error: any } {
  const result = DeckSettingsUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację talii
 */
export function safeValidateDeckUpdate(
  data: unknown
): { success: true; data: DeckUpdate } | { success: false; error: any } {
  const result = DeckUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację danych nauki talii
 */
export function safeValidateDeckLearningDataUpdate(
  data: unknown
):
  | { success: true; data: DeckLearningDataUpdate }
  | { success: false; error: any } {
  const result = DeckLearningDataUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację danych karty (cardData)
 */
export function safeValidateCardDataUpdate(
  data: unknown
): { success: true; data: CardDataUpdate } | { success: false; error: any } {
  const result = CardDataUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację core karty
 */
export function safeValidateCardCoreUpdate(
  data: unknown
): { success: true; data: CardCoreUpdate } | { success: false; error: any } {
  const result = CardCoreUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację algorytmu karty
 */
export function safeValidateCardAlgoUpdate(
  data: unknown
): { success: true; data: CardAlgoUpdate } | { success: false; error: any } {
  const result = CardAlgoUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację firstLearn
 */
export function safeValidateFirstLearnUpdate(
  data: unknown
): { success: true; data: FirstLearnUpdate } | { success: false; error: any } {
  const result = FirstLearnUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację danych nauki karty
 */
export function safeValidateCardLearningUpdate(
  data: unknown
):
  | { success: true; data: CardLearningUpdate }
  | { success: false; error: any } {
  const result = CardLearningUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Waliduje częściową aktualizację karty
 */
export function safeValidateCardUpdate(
  data: unknown
): { success: true; data: CardUpdate } | { success: false; error: any } {
  const result = CardUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
