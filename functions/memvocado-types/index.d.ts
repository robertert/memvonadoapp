/**
 * Centralny eksport typów i funkcji walidacji
 *
 * Ten plik eksportuje wszystkie typy TypeScript wygenerowane z schematów Zod
 * oraz funkcje pomocnicze do walidacji danych w runtime.
 */
export * from "./schemas/index";
import type { User, UserCore, UserStats, UserSettings, Card, CardCore, CardData, CardAlgo, FirstLearn, Deck, DeckCore, DeckSettings, DeckLearningData, DeckLearningCore, StudySession, Notification, Season, SeasonUserPoints, LeagueGroup, LeagueGroupMember, SearchFilters, SearchLog, UserProgress, SuperMemoResult, CardChangeWithType, DeckCoreUpdate, DeckSettingsUpdate, DeckUpdate, DeckLearningDataUpdate, CardDataUpdate, CardCoreUpdate, CardAlgoUpdate, FirstLearnUpdate, CardLearningUpdate, CardUpdate } from "./schemas/index";
/**
 * Waliduje dane użytkownika (core)
 */
export declare function safeValidateUserCore(data: unknown): {
    success: true;
    data: UserCore;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje pełne dane użytkownika
 */
export declare function safeValidateUser(data: unknown): {
    success: true;
    data: User;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje dane karty (core)
 */
export declare function safeValidateCardCore(data: unknown): {
    success: true;
    data: CardCore;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje pełne dane karty
 */
export declare function safeValidateCard(data: unknown): {
    success: true;
    data: Card;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje dane talii (core)
 */
export declare function safeValidateDeckCore(data: unknown): {
    success: true;
    data: DeckCore;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje pełne dane talii
 */
export declare function safeValidateDeck(data: unknown): {
    success: true;
    data: Deck;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje dane talii użytkownika (core)
 */
export declare function safeValidateDeckLearningCore(data: unknown): {
    success: true;
    data: DeckLearningCore;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje pełne dane talii użytkownika
 */
export declare function safeValidateDeckLearningData(data: unknown): {
    success: true;
    data: DeckLearningData;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje dodatkowe struktury wspierające
 */
export declare function safeValidateUserStats(data: unknown): {
    success: true;
    data: UserStats;
} | {
    success: false;
    error: any;
};
export declare function safeValidateUserSettings(data: unknown): {
    success: true;
    data: UserSettings;
} | {
    success: false;
    error: any;
};
export declare function safeValidateCardData(data: unknown): {
    success: true;
    data: CardData;
} | {
    success: false;
    error: any;
};
export declare function safeValidateCardAlgo(data: unknown): {
    success: true;
    data: CardAlgo;
} | {
    success: false;
    error: any;
};
export declare function safeValidateFirstLearn(data: unknown): {
    success: true;
    data: FirstLearn;
} | {
    success: false;
    error: any;
};
export declare function safeValidateDeckSettings(data: unknown): {
    success: true;
    data: DeckSettings;
} | {
    success: false;
    error: any;
};
export declare function safeValidateStudySession(data: unknown): {
    success: true;
    data: StudySession;
} | {
    success: false;
    error: any;
};
export declare function safeValidateNotification(data: unknown): {
    success: true;
    data: Notification;
} | {
    success: false;
    error: any;
};
export declare function safeValidateSeason(data: unknown): {
    success: true;
    data: Season;
} | {
    success: false;
    error: any;
};
export declare function safeValidateSeasonUserPoints(data: unknown): {
    success: true;
    data: SeasonUserPoints;
} | {
    success: false;
    error: any;
};
export declare function safeValidateLeagueGroup(data: unknown): {
    success: true;
    data: LeagueGroup;
} | {
    success: false;
    error: any;
};
export declare function safeValidateLeagueGroupMember(data: unknown): {
    success: true;
    data: LeagueGroupMember;
} | {
    success: false;
    error: any;
};
export declare function safeValidateSearchFilters(data: unknown): {
    success: true;
    data: SearchFilters;
} | {
    success: false;
    error: any;
};
export declare function safeValidateSearchLog(data: unknown): {
    success: true;
    data: SearchLog;
} | {
    success: false;
    error: any;
};
export declare function safeValidateUserProgress(data: unknown): {
    success: true;
    data: UserProgress;
} | {
    success: false;
    error: any;
};
export declare function safeValidateSuperMemoResult(data: unknown): {
    success: true;
    data: SuperMemoResult;
} | {
    success: false;
    error: any;
};
export declare function safeValidateCardChangeWithType(data: unknown): {
    success: true;
    data: CardChangeWithType;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje tablicę danych używając podanego schematu
 */
export declare function validateArray<T>(data: unknown, schema: {
    parse: (data: unknown) => T;
}): T[];
/**
 * Waliduje tablicę danych (bez rzucania błędu)
 */
export declare function safeValidateArray<T>(data: unknown, schema: {
    safeParse: (data: unknown) => {
        success: boolean;
        data?: T;
        error?: any;
    };
}): {
    success: true;
    data: T[];
} | {
    success: false;
    error: any;
};
/**
 * Konwertuje dane z Firestore (z timestampami) na typy JavaScript
 * Firestore zwraca Timestamp zamiast Date, więc trzeba je przekonwertować
 */
export declare function convertFirestoreData<T>(data: any): T;
/**
 * Waliduje częściową aktualizację danych talii (core)
 */
export declare function safeValidateDeckCoreUpdate(data: unknown): {
    success: true;
    data: DeckCoreUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację ustawień talii
 */
export declare function safeValidateDeckSettingsUpdate(data: unknown): {
    success: true;
    data: DeckSettingsUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację talii
 */
export declare function safeValidateDeckUpdate(data: unknown): {
    success: true;
    data: DeckUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację danych nauki talii
 */
export declare function safeValidateDeckLearningDataUpdate(data: unknown): {
    success: true;
    data: DeckLearningDataUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację danych karty (cardData)
 */
export declare function safeValidateCardDataUpdate(data: unknown): {
    success: true;
    data: CardDataUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację core karty
 */
export declare function safeValidateCardCoreUpdate(data: unknown): {
    success: true;
    data: CardCoreUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację algorytmu karty
 */
export declare function safeValidateCardAlgoUpdate(data: unknown): {
    success: true;
    data: CardAlgoUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację firstLearn
 */
export declare function safeValidateFirstLearnUpdate(data: unknown): {
    success: true;
    data: FirstLearnUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację danych nauki karty
 */
export declare function safeValidateCardLearningUpdate(data: unknown): {
    success: true;
    data: CardLearningUpdate;
} | {
    success: false;
    error: any;
};
/**
 * Waliduje częściową aktualizację karty
 */
export declare function safeValidateCardUpdate(data: unknown): {
    success: true;
    data: CardUpdate;
} | {
    success: false;
    error: any;
};
