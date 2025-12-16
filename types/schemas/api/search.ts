import { z } from "zod";
import { DeckSchema, SearchLogSchema } from "../index";
import { SearchFiltersSchema } from "../search";

// ===========================
// Search request schemas
// ===========================

export const SearchDecksRequestSchema = z
  .object({
    searchText: z.string().optional(),
    filters: SearchFiltersSchema.optional(),
    userId: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();
export type SearchDecksRequest = z.infer<typeof SearchDecksRequestSchema>;

export const GetSearchLogsRequestSchema = z
  .object({
    userId: z.string(),
  })
  .strict();
export type GetSearchLogsRequest = z.infer<typeof GetSearchLogsRequestSchema>;

// ===========================
// Search response schemas
// ===========================
export const SearchDecksResponseSchema = z.object({
  results: z.array(DeckSchema),
  total: z.number(),
});
export type SearchDecksResponse = z.infer<typeof SearchDecksResponseSchema>;

export const GetSearchLogsResponseSchema = z.object({
  logs: z.array(
    SearchLogSchema.extend({
      id: z.string(),
    })
  ),
});
export type GetSearchLogsResponse = z.infer<typeof GetSearchLogsResponseSchema>;
