import { z } from "zod";
/**
 * Helper schema: konwertuje Firebase Timestamp na Date
 * Obsługuje:
 * - Date obiekty
 * - Firestore Timestamp obiekty (z metodą toDate)
 * - Serializowane Timestamp obiekty z JSON ({_seconds, _nanoseconds} lub {seconds, nanoseconds})
 * - ISO stringi (np. "2025-11-24T10:06:31.007Z")
 */
export declare const TimestampSchema: z.ZodEffects<z.ZodDate, Date, unknown>;
