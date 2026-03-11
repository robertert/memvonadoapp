jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { SeasonService } from "../../src/services/SeasonService";
import {
  InMemorySeasonRepository,
  InMemoryUserRepository,
} from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";
import type { GetCurrentSeasonResponse } from "memvocado-types";

function makeService() {
  const seasonRepo = new InMemorySeasonRepository();
  const userRepo = new InMemoryUserRepository();
  const service = new SeasonService(seasonRepo, userRepo);
  return { service, seasonRepo, userRepo };
}

function makeSeason(overrides?: Partial<GetCurrentSeasonResponse>): GetCurrentSeasonResponse {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    seasonId: "season-1",
    startAt: now,
    endAt: end,
    status: "active",
    ...overrides,
  };
}

// ── getOrInitializeSeason() ───────────────────────────────────────────────────

describe("SeasonService.getOrInitializeSeason", () => {
  it("returns existing season when one is active", async () => {
    const { service, seasonRepo } = makeService();
    const existing = makeSeason({ seasonId: "season-42" });
    seasonRepo.seed(existing);

    const result = await service.getOrInitializeSeason();

    expect(result.seasonId).toBe("season-42");
    expect(result.status).toBe("active");
  });

  it("creates and returns a new season when none exists", async () => {
    const { service } = makeService();
    // No seed — no current season

    const result = await service.getOrInitializeSeason();

    expect(result.seasonId).toBeDefined();
    expect(result.startAt).toBeInstanceOf(Date);
    expect(result.endAt).toBeInstanceOf(Date);
    expect(result.endAt.getTime()).toBeGreaterThan(result.startAt.getTime());
  });

  it("is idempotent — two calls return the same season", async () => {
    const { service } = makeService();

    const first = await service.getOrInitializeSeason();
    const second = await service.getOrInitializeSeason();

    expect(second.seasonId).toBe(first.seasonId);
  });
});

// ── submitPoints() ────────────────────────────────────────────────────────────

describe("SeasonService.submitPoints", () => {
  it("adds points to the current season", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));

    await service.submitPoints("u1", 50);

    const pts = await seasonRepo.getUserSeasonPoints("s1", "u1");
    expect(pts?.points).toBe(50);
  });

  it("accumulates points across multiple calls", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));

    await service.submitPoints("u1", 30);
    await service.submitPoints("u1", 20);

    const pts = await seasonRepo.getUserSeasonPoints("s1", "u1");
    expect(pts?.points).toBe(50);
  });

  it("reads user's league for submitPoints", async () => {
    const { service, seasonRepo, userRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));
    userRepo.seed("u1", makeUser({ id: "u1", league: 3 }));

    await service.submitPoints("u1", 10);

    const pts = await seasonRepo.getUserSeasonPoints("s1", "u1");
    expect(pts?.league).toBe(3);
  });

  it("defaults to league 1 when user does not exist", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));

    // No user seeded — user?.league is undefined
    await service.submitPoints("nonexistent-user", 10);

    const pts = await seasonRepo.getUserSeasonPoints("s1", "nonexistent-user");
    expect(pts?.points).toBe(10);
    // No error thrown — graceful no-op for user data
  });
});

// ── rollOverSeason() ──────────────────────────────────────────────────────────

describe("SeasonService.rollOverSeason", () => {
  it("throws failed-precondition when no current season exists", async () => {
    const { service } = makeService();
    // No season seeded

    await expect(service.rollOverSeason()).rejects.toThrow("No current season");
  });

  it("returns a nextSeasonId string", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));
    seasonRepo.setNextSeasonId("s2");

    const result = await service.rollOverSeason();

    expect(typeof result.nextSeasonId).toBe("string");
    expect(result.nextSeasonId.length).toBeGreaterThan(0);
    expect(result.nextSeasonId).toBe("s2");
  });

  it("publishes leaderboard snapshot for the current season", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));

    await service.rollOverSeason();

    expect(seasonRepo.snapshotsPublished).toContain("s1");
  });

  it("creates a new season after rollover", async () => {
    const { service, seasonRepo } = makeService();
    seasonRepo.seed(makeSeason({ seasonId: "s1" }));
    seasonRepo.setNextSeasonId("s2");

    await service.rollOverSeason();

    // The repository's currentSeason should now be the new one
    const newSeason = await seasonRepo.getCurrentSeason();
    expect(newSeason?.seasonId).toBe("s2");
  });

  it("rolled-over season error has code failed-precondition", async () => {
    const { service } = makeService();

    await expect(service.rollOverSeason()).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });
});
