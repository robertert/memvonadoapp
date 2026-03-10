jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { SearchService } from "../../src/services/SearchService";
import { InMemoryDeckRepository, InMemoryUserRepository } from "./helpers/inMemoryRepositories";

function makeService() {
  const deckRepo = new InMemoryDeckRepository();
  const userRepo = new InMemoryUserRepository();
  const service = new SearchService(deckRepo, userRepo);
  return { service, deckRepo, userRepo };
}

// ── searchDecks ───────────────────────────────────────────────────────────────

describe("SearchService.searchDecks", () => {
  it("returns results even when logSearch throws (silent fail)", async () => {
    const { service, userRepo } = makeService();
    // Override addSearchLog to throw
    (userRepo as any).addSearchLog = jest.fn().mockRejectedValue(new Error("DB error"));

    const result = await service.searchDecks({ searchText: "test", userId: "u1" });

    expect(result).toMatchObject({ results: [], total: 0 });
  });

  it("does not log when userId is not provided", async () => {
    const { service, userRepo } = makeService();
    const spy = jest.spyOn(userRepo, "addSearchLog");

    await service.searchDecks({ searchText: "test" }); // no userId

    expect(spy).not.toHaveBeenCalled();
  });

  it("logs search when userId is provided", async () => {
    const { service, userRepo } = makeService();
    const spy = jest.spyOn(userRepo, "addSearchLog");

    await service.searchDecks({ searchText: "hello", userId: "u1" });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ── getSearchLogs ─────────────────────────────────────────────────────────────

describe("SearchService.getSearchLogs", () => {
  it("delegates to userRepo", async () => {
    const { service, userRepo } = makeService();
    const spy = jest.spyOn(userRepo, "getSearchLogs").mockResolvedValue([]);

    const result = await service.getSearchLogs("u1");

    expect(spy).toHaveBeenCalledWith("u1");
    expect(result).toEqual([]);
  });
});
