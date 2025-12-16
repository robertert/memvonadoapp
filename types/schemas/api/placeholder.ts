import { z } from "zod";

export const AddPlaceholderDataRequestSchema = z
  .object({
    userId: z.string().optional(),
    createUser: z.boolean().optional(),
  })
  .strict();
export type AddPlaceholderDataRequest = z.infer<
  typeof AddPlaceholderDataRequestSchema
>;

export const AddPlaceholderDataResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string(),
  decksCreated: z.number(),
  totalCards: z.number(),
  deckIds: z.array(z.string()),
});
export type AddPlaceholderDataResponse = z.infer<
  typeof AddPlaceholderDataResponseSchema
>;
