import { z } from "zod";
import { CardChangeWithTypeSchema } from "./index";
import { TimestampSchema } from "./base";

export * from "./api/auth";
export * from "./api/deck";
export * from "./api/league";
export * from "./api/placeholder";
export * from "./api/ranking";
export * from "./api/notification";
export * from "./api/search";
export * from "./api/user";

// ============================================================================
// Card Functions
// ============================================================================

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// ============================================================================
// Social Functions
// ============================================================================

export const GetFriendsStreaksResponseSchema = z.object({
  friendsStreaks: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      streak: z.number(),
    })
  ),
});

export type GetFriendsStreaksResponse = z.infer<
  typeof GetFriendsStreaksResponseSchema
>;
