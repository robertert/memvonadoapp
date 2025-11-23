import { z } from "zod";

/**
 * Helper schema: konwertuje Firebase Timestamp na Date
 */
export const TimestampSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date };

    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate();
    }
  }

  return value;
}, z.date());
