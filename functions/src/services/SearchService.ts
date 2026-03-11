import * as logger from "firebase-functions/logger";
import type { Deck, SearchFilters, SearchLog } from "memvocado-types";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";

/**
 * Service for searching decks and logging search activity.
 * @class
 */
export class SearchService {
  /**
   * @param {DeckRepository} deckRepo - Deck repository
   * @param {UserRepository} userRepo - User repository
   */
  constructor(
    private readonly deckRepo: DeckRepository,
    private readonly userRepo: UserRepository
  ) {}

  /**
   * @param {object} params - Search parameters
   * @return {Promise<object>} Search results
   */
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

  /**
   * @param {string} userId - User ID
   * @param {string} searchText - Search query text
   * @param {number} resultsCount - Number of results returned
   * @param {SearchFilters} [filters] - Optional search filters
   * @return {Promise<void>}
   */
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

  /**
   * @param {string} userId - User ID
   * @return {Promise<SearchLog[]>} Search logs for the user
   */
  async getSearchLogs(userId: string): Promise<SearchLog[]> {
    return this.userRepo.getSearchLogs(userId);
  }
}
