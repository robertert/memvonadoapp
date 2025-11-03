/**
 * Get leaderboard for user's group (20-person league group)
 * Returns the ranking of all members in the user's current league group
 */
export declare const getLeaderboard: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    entries: never[];
    groupId: null;
    leagueNumber: null;
    seasonId: any;
    totalMembers?: undefined;
} | {
    entries: never[];
    groupId: null;
    leagueNumber: number;
    seasonId: any;
    totalMembers?: undefined;
} | {
    entries: {
        userId: string;
        username: string;
        points: number;
        position: number;
        lastActivityAt: any;
    }[];
    groupId: string;
    leagueNumber: number;
    seasonId: any;
    totalMembers: number;
}>, unknown>;
/**
 * Get user's ranking position in their group
 */
export declare const getUserRanking: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    position: number;
    groupId: string;
    leagueNumber: number;
    points: number;
    totalMembers: number;
} | null>, unknown>;
/**
 * Get rankings for followed users (friends in their groups)
 */
export declare const getFollowingRankings: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    rankings: ({
        userId: string;
        position: null;
        points: number;
        leagueNumber: number;
        username?: undefined;
        groupId?: undefined;
        totalMembers?: undefined;
    } | {
        userId: string;
        username: string;
        position: number;
        points: number;
        leagueNumber: number;
        groupId: string;
        totalMembers: number;
    })[];
}>, unknown>;
/**
 * Assign user to a league group
 * Finds an available group with less than 20 members, or creates a new one
 */
export declare const assignUserToGroup: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    groupId: string;
}>, unknown>;
