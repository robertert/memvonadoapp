/**
 * Typ pomocniczy reprezentujący obiekt Timestamp z Firestore.
 */
type TimestampLike = {
  toDate?: () => Date;
  _seconds?: number;
  _nanoseconds?: number;
  seconds?: number;
  nanoseconds?: number;
};

/**
 * Konwertuje wartość Timestamp (różne reprezentacje) na string ISO.
 * @param {TimestampLike} value - wartość Timestamp
 * @return {string | null} string ISO lub null jeśli nie można przekonwertować
 */
function convertTimestamp(value: TimestampLike): string | null {
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  const seconds = value._seconds ?? value.seconds;
  const nanoseconds = value._nanoseconds ?? value.nanoseconds;

  if (typeof seconds === "number" && typeof nanoseconds === "number") {
    return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString();
  }

  return null;
}

/**
 * Rekurencyjnie konwertuje wszystkie wartości Date / Firestore Timestamp
 * na stringi ISO, żeby HTTPS Callable mogły je bezpiecznie serializować.
 * @param {T} value - wejściowa struktura (deck, karty, listy)
 * @return {T} struktura gotowa do JSON.stringify
 */
export function serializeTimestamps<T>(value: T): T {
  const convert = (input: unknown): unknown => {
    if (input instanceof Date) {
      return input.toISOString();
    }

    if (input && typeof input === "object") {
      const maybeTimestamp = input as TimestampLike;
      const converted = convertTimestamp(maybeTimestamp);
      if (converted) {
        return converted;
      }
    }

    if (Array.isArray(input)) {
      return input.map((item) => convert(item));
    }

    if (input && typeof input === "object") {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(input)) {
        result[key] = convert((input as Record<string, unknown>)[key]);
      }
      return result;
    }

    return input;
  };

  return convert(value) as T;
}
