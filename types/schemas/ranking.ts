import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Sezon rankingowy
 */
export const SeasonCreateSchema = z
  .object({
    seasonId: z.string(),
    startAt: TimestampSchema,
    endAt: TimestampSchema,
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .strict();

export type SeasonCreate = z.infer<typeof SeasonCreateSchema>;

export const SeasonSchema = SeasonCreateSchema.extend({
  id: z.string(),
});

export type Season = z.infer<typeof SeasonSchema>;

/**
 * Punkty użytkownika w sezonie
 */
export const SeasonUserPointsSchema = z
  .object({
    points: z.number().min(0),
    league: z.number().min(1).max(15),
    groupId: z.string().optional(),
    lastActivityAt: TimestampSchema,
  })
  .strict();

export type SeasonUserPoints = z.infer<typeof SeasonUserPointsSchema>;

/**
 * Grupa ligowa
 */
export const LeagueGroupSchema = z
  .object({
    createdAt: TimestampSchema,
    isFull: z.boolean(),
    capacity: z.number().min(1).default(20),
    currentCount: z.number().min(0),
    id: z.string(),
    leagueNumber: z.number().min(1).max(15),
  })
  .strict();

export type LeagueGroup = z.infer<typeof LeagueGroupSchema>;

/**
 * Członek grupy ligowej
 */
export const LeagueGroupMemberSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    points: z.number().min(0),
    lastActivityAt: TimestampSchema,
  })
  .strict();

export type LeagueGroupMember = z.infer<typeof LeagueGroupMemberSchema>;
