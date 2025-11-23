"use strict";
/**
 * Centralny eksport typów i funkcji walidacji
 *
 * Ten plik eksportuje wszystkie typy TypeScript wygenerowane z schematów Zod
 * oraz funkcje pomocnicze do walidacji danych w runtime.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeValidateUserCore = safeValidateUserCore;
exports.safeValidateUser = safeValidateUser;
exports.safeValidateCardCore = safeValidateCardCore;
exports.safeValidateCard = safeValidateCard;
exports.safeValidateDeckCore = safeValidateDeckCore;
exports.safeValidateDeck = safeValidateDeck;
exports.safeValidateDeckLearningCore = safeValidateDeckLearningCore;
exports.safeValidateDeckLearningData = safeValidateDeckLearningData;
exports.safeValidateUserStats = safeValidateUserStats;
exports.safeValidateUserSettings = safeValidateUserSettings;
exports.safeValidateCardData = safeValidateCardData;
exports.safeValidateCardAlgo = safeValidateCardAlgo;
exports.safeValidateFirstLearn = safeValidateFirstLearn;
exports.safeValidateDeckSettings = safeValidateDeckSettings;
exports.safeValidateStudySession = safeValidateStudySession;
exports.safeValidateNotification = safeValidateNotification;
exports.safeValidateSeason = safeValidateSeason;
exports.safeValidateSeasonUserPoints = safeValidateSeasonUserPoints;
exports.safeValidateLeagueGroup = safeValidateLeagueGroup;
exports.safeValidateLeagueGroupMember = safeValidateLeagueGroupMember;
exports.safeValidateSearchFilters = safeValidateSearchFilters;
exports.safeValidateSearchLog = safeValidateSearchLog;
exports.safeValidateUserProgress = safeValidateUserProgress;
exports.safeValidateSuperMemoResult = safeValidateSuperMemoResult;
exports.safeValidateCardChangeWithType = safeValidateCardChangeWithType;
exports.validateArray = validateArray;
exports.safeValidateArray = safeValidateArray;
exports.convertFirestoreData = convertFirestoreData;
exports.safeValidateDeckCoreUpdate = safeValidateDeckCoreUpdate;
exports.safeValidateDeckSettingsUpdate = safeValidateDeckSettingsUpdate;
exports.safeValidateDeckUpdate = safeValidateDeckUpdate;
exports.safeValidateDeckLearningDataUpdate = safeValidateDeckLearningDataUpdate;
exports.safeValidateCardDataUpdate = safeValidateCardDataUpdate;
exports.safeValidateCardCoreUpdate = safeValidateCardCoreUpdate;
exports.safeValidateCardAlgoUpdate = safeValidateCardAlgoUpdate;
exports.safeValidateFirstLearnUpdate = safeValidateFirstLearnUpdate;
exports.safeValidateCardLearningUpdate = safeValidateCardLearningUpdate;
exports.safeValidateCardUpdate = safeValidateCardUpdate;
// Eksport wszystkich schematów
__exportStar(require("./schemas/index"), exports);
// Re-eksport schematów do walidacji
const index_1 = require("./schemas/index");
// ============================================================================
// Funkcje walidacji
// ============================================================================
/**
 * Waliduje dane użytkownika (core)
 */
function safeValidateUserCore(data) {
    const result = index_1.UserCoreSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje pełne dane użytkownika
 */
function safeValidateUser(data) {
    const result = index_1.UserSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje dane karty (core)
 */
function safeValidateCardCore(data) {
    const result = index_1.CardCoreSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje pełne dane karty
 */
function safeValidateCard(data) {
    const result = index_1.CardSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje dane talii (core)
 */
function safeValidateDeckCore(data) {
    const result = index_1.DeckCoreSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje pełne dane talii
 */
function safeValidateDeck(data) {
    const result = index_1.DeckSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje dane talii użytkownika (core)
 */
function safeValidateDeckLearningCore(data) {
    const result = index_1.DeckLearningCoreSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje pełne dane talii użytkownika
 */
function safeValidateDeckLearningData(data) {
    const result = index_1.DeckLearningDataSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje dodatkowe struktury wspierające
 */
function safeValidateUserStats(data) {
    const result = index_1.UserStatsSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateUserSettings(data) {
    const result = index_1.UserSettingsSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateCardData(data) {
    const result = index_1.CardDataSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateCardAlgo(data) {
    const result = index_1.CardAlgoSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateFirstLearn(data) {
    const result = index_1.FirstLearnSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateDeckSettings(data) {
    const result = index_1.DeckSettingsSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateStudySession(data) {
    const result = index_1.StudySessionSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateNotification(data) {
    const result = index_1.NotificationSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateSeason(data) {
    const result = index_1.SeasonSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateSeasonUserPoints(data) {
    const result = index_1.SeasonUserPointsSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateLeagueGroup(data) {
    const result = index_1.LeagueGroupSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateLeagueGroupMember(data) {
    const result = index_1.LeagueGroupMemberSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateSearchFilters(data) {
    const result = index_1.SearchFiltersSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateSearchLog(data) {
    const result = index_1.SearchLogSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateUserProgress(data) {
    const result = index_1.UserProgressSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateSuperMemoResult(data) {
    const result = index_1.SuperMemoResultSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
function safeValidateCardChangeWithType(data) {
    const result = index_1.CardChangeWithTypeSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje tablicę danych używając podanego schematu
 */
function validateArray(data, schema) {
    if (!Array.isArray(data)) {
        throw new Error("Expected an array");
    }
    return data.map((item) => schema.parse(item));
}
/**
 * Waliduje tablicę danych (bez rzucania błędu)
 */
function safeValidateArray(data, schema) {
    if (!Array.isArray(data)) {
        return { success: false, error: new Error("Expected an array") };
    }
    const results = data.map((item) => schema.safeParse(item));
    const errors = results.filter((r) => !r.success);
    if (errors.length > 0) {
        return { success: false, error: errors[0].error };
    }
    return { success: true, data: results.map((r) => r.data) };
}
/**
 * Konwertuje dane z Firestore (z timestampami) na typy JavaScript
 * Firestore zwraca Timestamp zamiast Date, więc trzeba je przekonwertować
 */
function convertFirestoreData(data) {
    // Rekurencyjnie konwertuj Timestamp na Date
    const convertValue = (value) => {
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
            const converted = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    converted[key] = convertValue(value[key]);
                }
            }
            return converted;
        }
        return value;
    };
    return convertValue(data);
}
// ============================================================================
// Funkcje walidacji dla częściowych update'ów
// ============================================================================
/**
 * Waliduje częściową aktualizację danych talii (core)
 */
function safeValidateDeckCoreUpdate(data) {
    const result = index_1.DeckCoreUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację ustawień talii
 */
function safeValidateDeckSettingsUpdate(data) {
    const result = index_1.DeckSettingsUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację talii
 */
function safeValidateDeckUpdate(data) {
    const result = index_1.DeckUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację danych nauki talii
 */
function safeValidateDeckLearningDataUpdate(data) {
    const result = index_1.DeckLearningDataUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację danych karty (cardData)
 */
function safeValidateCardDataUpdate(data) {
    const result = index_1.CardDataUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację core karty
 */
function safeValidateCardCoreUpdate(data) {
    const result = index_1.CardCoreUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację algorytmu karty
 */
function safeValidateCardAlgoUpdate(data) {
    const result = index_1.CardAlgoUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację firstLearn
 */
function safeValidateFirstLearnUpdate(data) {
    const result = index_1.FirstLearnUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację danych nauki karty
 */
function safeValidateCardLearningUpdate(data) {
    const result = index_1.CardLearningUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
/**
 * Waliduje częściową aktualizację karty
 */
function safeValidateCardUpdate(data) {
    const result = index_1.CardUpdateSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
