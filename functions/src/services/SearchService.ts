import * as logger from "firebase-functions/logger";
import type { Deck, SearchFilters, SearchLog } from "memvocado-types";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";

export class SearchService {
  constructor(
    private readonly deckRepo: DeckRepository,
    private readonly userRepo: UserRepository
  ) {}

  async searchDecks(params: {
    searchText?: string;
    filters?: SearchFilters;
    userId?: string;
    limit?: number;
  }): Promise<{ results: Deck[]; total: number }> {
    const { searchText, filters, userId, limit = 20 } = params;

    const results = await this.deckRepo.searchDecks(searchText || "", filters, limit);

    if (userId) {
      try {
        await this.logSearch(userId, searchText || "", results.length, filters);
      } catch (err) {
        logger.warn("SearchService: failed to log search", err);
      }
    }

    return { results, total: results.length };
  }

  async logSearch(
    userId: string,
    searchText: string,
    resultsCount: number,
    filters?: SearchFilters
  ): Promise<void> {
    const log: Omit<SearchLog, "id"> = {
      userId,
      searchText,
      resultsCount,
      timestamp: new Date(),
      filters: filters || {},
    };
    await this.userRepo.addSearchLog(userId, log);
  }

  async getSearchLogs(userId: string): Promise<SearchLog[]> {
    return this.userRepo.getSearchLogs(userId);
  }
}
