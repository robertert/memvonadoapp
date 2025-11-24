"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimestampSchema = void 0;
const zod_1 = require("zod");
/**
 * Helper schema: konwertuje Firebase Timestamp na Date
 * Obsługuje:
 * - Date obiekty
 * - Firestore Timestamp obiekty (z metodą toDate)
 * - Serializowane Timestamp obiekty z JSON ({_seconds, _nanoseconds} lub {seconds, nanoseconds})
 * - ISO stringi (np. "2025-11-24T10:06:31.007Z")
 */
exports.TimestampSchema = zod_1.z.preprocess((value) => {
    var _a, _b;
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    if (value && typeof value === "object") {
        const maybeTimestamp = value;
        // Firestore Timestamp z metodą toDate (gdy dane są bezpośrednio z Firestore)
        if (typeof maybeTimestamp.toDate === "function") {
            return maybeTimestamp.toDate();
        }
        // Serializowany Timestamp z JSON (gdy dane przychodzą przez HTTP)
        // Format: {_seconds: number, _nanoseconds: number} lub {seconds: number, nanoseconds: number}
        const seconds = (_a = maybeTimestamp._seconds) !== null && _a !== void 0 ? _a : maybeTimestamp.seconds;
        const nanoseconds = (_b = maybeTimestamp._nanoseconds) !== null && _b !== void 0 ? _b : maybeTimestamp.nanoseconds;
        if (typeof seconds === "number" && typeof nanoseconds === "number") {
            // Konwertuj sekundy i nanosekundy na Date
            return new Date(seconds * 1000 + nanoseconds / 1000000);
        }
    }
    return value;
}, zod_1.z.date());
