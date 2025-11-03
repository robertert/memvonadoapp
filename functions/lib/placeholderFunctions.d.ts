/**
 * Dodaje placeholder data do aplikacji dla testów ręcznych lub emulatora
 * Tworzy przykładowego użytkownika z taliami i kartami
 */
export declare const addPlaceholderData: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    userId: any;
    decksCreated: number;
    totalCards: number;
    deckIds: string[];
}>, unknown>;
