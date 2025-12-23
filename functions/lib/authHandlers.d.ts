/**
 * Callable Function: tworzy podstawowy dokument użytkownika w Firestore.
 * Wywoływana automatycznie po rejestracji, aby użytkownik miał dokument w bazie
 * nawet jeśli wyjdzie przed ukończeniem onboardingu.
 */
export declare const ensureUserDocument: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
}>, unknown>;
export declare const checkUsernameAvailability: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    isAvailable: boolean;
}>, unknown>;
/**
 * Callable Function: zapisuje dane onboardingu użytkownika w Firestore.
 * Wywoływana przez klienta po uzupełnieniu wszystkich danych w onboarding.
 */
export declare const completeOnboarding: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message?: string | undefined;
}>, unknown>;
