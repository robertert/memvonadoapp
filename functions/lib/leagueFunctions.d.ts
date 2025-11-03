/**
 * Get league information
 */
export declare const getLeagueInfo: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    league: {
        id: number;
        name: string;
        color: string;
        description: string;
    };
}>, unknown>;
/**
 * Get user's current group information
 */
export declare const getUserGroup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    groupId: string;
    leagueNumber: number;
    memberCount: number;
    capacity: number;
    isFull: boolean;
} | null>, unknown>;
/**
 * Update user's league and assign to new group
 */
export declare const updateUserLeague: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    league: any;
    groupId?: undefined;
} | {
    success: boolean;
    league: any;
    groupId: string;
}>, unknown>;
/**
 * Get all league information
 */
export declare const getAllLeaguesInfo: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    leagues: {
        id: number;
        name: string;
        color: string;
        description: string;
    }[];
}>, unknown>;
