export interface NotificationData {
    title: string;
    body: string;
    type: "info" | "success" | "warning" | "error";
    linkTo?: string;
}
/**
 * Get notifications for a user
 */
export declare const getNotifications: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    notifications: {
        id: string;
    }[];
}>, unknown>;
/**
 * Mark notification as read
 */
export declare const markNotificationRead: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Create a notification for a user (for system use)
 */
export declare const createNotification: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    notificationId: string;
}>, unknown>;
/**
 * Trigger: Create notification when user advances league
 * Triggered when user's league field changes
 */
export declare const onLeagueAdvance: import("firebase-functions/core").CloudFunction<import("firebase-functions/firestore").FirestoreEvent<import("firebase-functions/firestore").Change<import("firebase-functions/firestore").DocumentSnapshot> | undefined, {
    userId: string;
}>>;
/**
 * Trigger: Create notification when streak is broken
 * This should be triggered by a scheduled function or when streak reaches 0
 */
export declare const notifyStreakBroken: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
/**
 * Trigger: Create notification when season ends
 * Should be called from weeklyRollOver
 */
export declare const notifySeasonEnd: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
}>, unknown>;
