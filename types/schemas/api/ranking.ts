import { z } from "zod";
import { TimestampSchema } from "../base";

// ===========================
// Ranking request schemas
// ===========================

export const GetLeaderboardRequestSchema = z
  .object({
    userId: z.string(),
    seasonId: z.string().optional(),
  })
  .strict();
export type GetLeaderboardRequest = z.infer<typeof GetLeaderboardRequestSchema>;

export const GetUserRankingRequestSchema = z
  .object({
    userId: z.string(),
    seasonId: z.string().optional(),
  })
  .strict();
export type GetUserRankingRequest = z.infer<typeof GetUserRankingRequestSchema>;

export const GetFollowingRankingsRequestSchema = z
  .object({
    userId: z.string(),
    seasonId: z.string().optional(),
  })
  .strict();
export type GetFollowingRankingsRequest = z.infer<
  typeof GetFollowingRankingsRequestSchema
>;

export const AssignUserToGroupRequestSchema = z
  .object({
    userId: z.string(),
    leagueNumber: z.number().int().min(1).max(15),
    seasonId: z.string(),
  })
  .strict();
export type AssignUserToGroupRequest = z.infer<
  typeof AssignUserToGroupRequestSchema
>;

// ===========================
// Ranking response schemas
// ===========================

export const GetLeaderboardResponseSchema = z.object({
  entries: z.array(
    z.object({
      userId: z.string(),
      username: z.string(),
      points: z.number(),
      position: z.number(),
      lastActivityAt: TimestampSchema.nullable(),
    })
  ),
  groupId: z.string().nullable(),
  leagueNumber: z.number().nullable(),
  seasonId: z.string(),
  totalMembers: z.number(),
});
export type GetLeaderboardResponse = z.infer<
  typeof GetLeaderboardResponseSchema
>;

export const GetUserRankingResponseSchema = z.object({
  position: z.number().nullable(),
  groupId: z.string().nullable(),
  leagueNumber: z.number().nullable(),
  points: z.number(),
  totalMembers: z.number().nullable(),
});
export type GetUserRankingResponse = z.infer<
  typeof GetUserRankingResponseSchema
>;

export const GetFollowingRankingsResponseSchema = z.object({
  rankings: z.array(
    z.object({
      userId: z.string(),
      username: z.string().optional(),
      position: z.number().nullable(),
      points: z.number(),
      leagueNumber: z.number(),
      groupId: z.string().optional(),
      totalMembers: z.number().optional(),
    })
  ),
});
export type GetFollowingRankingsResponse = z.infer<
  typeof GetFollowingRankingsResponseSchema
>;

export const AssignUserToGroupResponseSchema = z.object({
  success: z.boolean(),
  groupId: z.string(),
});
export type AssignUserToGroupResponse = z.infer<
  typeof AssignUserToGroupResponseSchema
>;
