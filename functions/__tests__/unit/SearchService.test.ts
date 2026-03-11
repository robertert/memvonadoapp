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

// ── searchDecks — edge cases ───────────────────────────────────────────────────

describe("SearchService.searchDecks edge cases", () => {
  it("empty searchText still calls deckRepo.searchDecks", async () => {
    const { service, deckRepo } = makeService();
    const spy = jest.spyOn(deckRepo, "searchDecks").mockResolvedValue([]);

    await service.searchDecks({ searchText: "" });

    expect(spy).toHaveBeenCalledWith("", undefined, 20);
  });

  it("applies custom limit to deckRepo.searchDecks", async () => {
    const { service, deckRepo } = makeService();
    const spy = jest.spyOn(deckRepo, "searchDecks").mockResolvedValue([]);

    await service.searchDecks({ searchText: "test", limit: 5 });

    expect(spy).toHaveBeenCalledWith("test", undefined, 5);
  });

  it("forwards filters to deckRepo.searchDecks", async () => {
    const { service, deckRepo } = makeService();
    const spy = jest.spyOn(deckRepo, "searchDecks").mockResolvedValue([]);
    const filters = { category: "science" } as any;

    await service.searchDecks({ searchText: "cells", filters });

    expect(spy).toHaveBeenCalledWith("cells", filters, 20);
  });

  it("returns total equal to results length", async () => {
    const { service, deckRepo } = makeService();
    const fakeDecks = [{ id: "d1" }, { id: "d2" }] as any[];
    jest.spyOn(deckRepo, "searchDecks").mockResolvedValue(fakeDecks);

    const result = await service.searchDecks({ searchText: "test" });

    expect(result.total).toBe(2);
    expect(result.results).toHaveLength(2);
  });

  it("logs search when userId and results are provided", async () => {
    const { service, userRepo } = makeService();
    const spy = jest.spyOn(userRepo, "addSearchLog");

    await service.searchDecks({ searchText: "vocab", userId: "u1" });

    expect(spy).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        userId: "u1",
        searchText: "vocab",
      })
    );
  });

  it("uses empty string for undefined searchText when logging", async () => {
    const { service, userRepo } = makeService();
    const spy = jest.spyOn(userRepo, "addSearchLog");

    await service.searchDecks({ userId: "u1" });

    expect(spy).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ searchText: "" })
    );
  });

  it("does not throw when deckRepo.searchDecks returns empty array", async () => {
    const { service, deckRepo } = makeService();
    jest.spyOn(deckRepo, "searchDecks").mockResolvedValue([]);

    const result = await service.searchDecks({ searchText: "test" });

    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });
});
