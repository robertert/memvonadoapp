import { z } from "zod";

/**
 * Helper schema: konwertuje Firebase Timestamp na Date
 * Obsługuje:
 * - Date obiekty
 * - Firestore Timestamp obiekty (z metodą toDate)
 * - Serializowane Timestamp obiekty z JSON ({_seconds, _nanoseconds} lub {seconds, nanoseconds})
 * - ISO stringi (np. "2025-11-24T10:06:31.007Z")
 */
export const TimestampSchema = z.preprocess((value) => {
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
    const maybeTimestamp = value as {
      toDate?: () => Date;
      _seconds?: number;
      _nanoseconds?: number;
      seconds?: number;
      nanoseconds?: number;
    };

    // Firestore Timestamp z metodą toDate (gdy dane są bezpośrednio z Firestore)
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate();
    }

    // Serializowany Timestamp z JSON (gdy dane przychodzą przez HTTP)
    // Format: {_seconds: number, _nanoseconds: number} lub {seconds: number, nanoseconds: number}
    const seconds = maybeTimestamp._seconds ?? maybeTimestamp.seconds;
    const nanoseconds =
      maybeTimestamp._nanoseconds ?? maybeTimestamp.nanoseconds;

    if (typeof seconds === "number" && typeof nanoseconds === "number") {
      // Konwertuj sekundy i nanosekundy na Date
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    }
  }

  return value;
}, z.date());
