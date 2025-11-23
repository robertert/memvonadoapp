/**
 * Common types used across Cloud Functions
 *
 * Re-eksportuje typy z centralnego katalogu types/ dla zachowania kompatybilności
 * z istniejącym kodem. Wszystkie nowe typy powinny być importowane bezpośrednio z types/
 */

// Re-eksport enumów / stałych
export { CardGrade } from "memvocado-types";

// Re-eksport typów z centralnego katalogu
export type {
  Deck,
  DeckCore,
  DeckLearningData,
  DeckLearningCore,
  DeckSettings,
  CardData,
  CardCore,
  Card,
  CardAlgo,
  FirstLearn,
  SuperMemoResult,
  SearchFilters,
  UserStats,
  UserCore,
  UserSettings,
  User,
  StudySession,
  StudySessionCreate,
  Notification,
  Season,
  SeasonUserPoints,
  LeagueGroup,
  LeagueGroupMember,
  SearchLog,
  UserProgress,
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
} from "memvocado-types";

export type {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthRegisterResponse,
  AuthLoginResponse,
  AuthUserSnapshot,
} from "memvocado-types";

// Re-eksport schematów dla walidacji
export {
  DeckSchema,
  DeckCoreSchema,
  DeckLearningDataSchema,
  DeckLearningCoreSchema,
  DeckSettingsSchema,
  CardDataSchema,
  CardCoreSchema,
  CardSchema,
  CardAlgoSchema,
  FirstLearnSchema,
  SuperMemoResultSchema,
  SearchFiltersSchema,
  UserStatsSchema,
  UserCoreSchema,
  UserSettingsSchema,
  UserSchema,
  StudySessionSchema,
  StudySessionCreateSchema,
  NotificationSchema,
  SeasonSchema,
  SeasonUserPointsSchema,
  LeagueGroupSchema,
  LeagueGroupMemberSchema,
  SearchLogSchema,
  UserProgressSchema,
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
} from "memvocado-types";

export {
  AuthRegisterRequestSchema,
  AuthLoginRequestSchema,
  AuthRegisterResponseSchema,
  AuthLoginResponseSchema,
  AuthUserSnapshotSchema,
} from "memvocado-types";
