/**
 * Rekurencyjnie konwertuje wszystkie wartości Date / Firestore Timestamp
 * na stringi ISO, żeby HTTPS Callable mogły je bezpiecznie serializować.
 * @param {T} value - wejściowa struktura (deck, karty, listy)
 * @return {T} struktura gotowa do JSON.stringify
 */
export declare function serializeTimestamps<T>(value: T): T;
