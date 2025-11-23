import { z } from "zod";

import { TimestampSchema } from "./base";

/**
 * Filtry wyszukiwania
 */
export const SearchFiltersSchema = z
  .object({
    category: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Log wyszukiwania
 */
export const SearchLogSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    searchText: z.string(),
    filters: SearchFiltersSchema,
    resultsCount: z.number().min(0),
    timestamp: TimestampSchema,
  })
  .strict();

export type SearchLog = z.infer<typeof SearchLogSchema>;
