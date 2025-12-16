import { z } from "zod";

// ===========================
// League request schemas
// ===========================

export const GetLeagueInfoRequestSchema = z
  .object({
    leagueNumber: z.number().int().min(1).max(15),
  })
  .strict();
export type GetLeagueInfoRequest = z.infer<typeof GetLeagueInfoRequestSchema>;

export const GetUserGroupRequestSchema = z
  .object({
    userId: z.string(),
    seasonId: z.string().optional(),
  })
  .strict();
export type GetUserGroupRequest = z.infer<typeof GetUserGroupRequestSchema>;

export const UpdateUserLeagueRequestSchema = z
  .object({
    userId: z.string(),
    newLeague: z.number().int().min(1).max(15),
    seasonId: z.string().optional(),
  })
  .strict();
export type UpdateUserLeagueRequest = z.infer<
  typeof UpdateUserLeagueRequestSchema
>;

// ===========================
// League response schemas
// ===========================

export const GetLeagueInfoResponseSchema = z.object({
  league: z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string(),
  }),
});
export type GetLeagueInfoResponse = z.infer<typeof GetLeagueInfoResponseSchema>;

export const GetAllLeaguesInfoResponseSchema = z.object({
  leagues: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      color: z.string(),
      description: z.string(),
    })
  ),
});
export type GetAllLeaguesInfoResponse = z.infer<
  typeof GetAllLeaguesInfoResponseSchema
>;

export const GetUserGroupResponseSchema = z.object({
  groupId: z.string().nullable(),
  leagueNumber: z.number().nullable(),
  memberCount: z.number(),
  capacity: z.number(),
  isFull: z.boolean(),
});
export type GetUserGroupResponse = z.infer<typeof GetUserGroupResponseSchema>;
