/**
 * Search decks with advanced filtering
 */
export declare const searchDecks: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    results: {
        id: string;
    }[];
    total: number;
}>, unknown>;
/**
 * Get search logs
 */
export declare const getSearchLogs: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    id: string;
}[]>, unknown>;
