interface LeagueInfo {
    id: number;
    name: string;
    color: string;
    description: string;
}
/**
 * Get league information
 */
export declare const getLeagueInfo: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    league: LeagueInfo;
}>, unknown>;
/**
 * Get user's current group information
 */
export declare const getUserGroup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    groupId: null;
    leagueNumber: null;
    memberCount: number;
    capacity: number;
    isFull: boolean;
} | {
    groupId: string;
    leagueNumber: number;
    memberCount: number;
    capacity: number;
    isFull: boolean;
}>, unknown>;
/**
 * Update user's league and assign to new group
 */
export declare const updateUserLeague: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    league: number;
}>, unknown>;
/**
 * Get all league information
 */
export declare const getAllLeaguesInfo: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    leagues: LeagueInfo[];
}>, unknown>;
export {};
