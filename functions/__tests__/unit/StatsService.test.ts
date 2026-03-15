import { StatsService } from "../../src/services/StatsService";
import {
  InMemoryUserRepository,
  InMemoryStatsRepository,
} from "./helpers/inMemoryRepositories";
import { makeUser, makeDeck, makeDailyStats } from "./helpers/factories";

function makeService() {
  const statsRepo = new InMemoryStatsRepository();
  const userRepo = new InMemoryUserRepository();
  const service = new StatsService(statsRepo, userRepo);
  return { service, statsRepo, userRepo };
}

// ── getDeckDailyStatsToday ────────────────────────────────────────────────────

describe("StatsService.getDeckDailyStatsToday", () => {
  it("returns null when no stats have been written yet", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    // Act
    const result = await service.getDeckDailyStatsToday("u1", "d1");

    // Assert
    expect(result).toBeNull();
  });

  it("returns null when stats were written on a different day", async () => {
    // Arrange
    const { service, statsRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    statsRepo.seed(
      "u1",
      "d1",
      makeDailyStats({ lastUpdatedStats: yesterday })
    );

    // Act
    const result = await service.getDeckDailyStatsToday("u1", "d1");

    // Assert
    expect(result).toBeNull();
  });

  it("returns stats when last update was today", async () => {
    // Arrange
    const { service, statsRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    const todayStats = makeDailyStats({
      completedNewToday: 5,
      completedDueToday: 3,
      lastUpdatedStats: new Date(),
    });
    statsRepo.seed("u1", "d1", todayStats);

    // Act
    const result = await service.getDeckDailyStatsToday("u1", "d1");

    // Assert
    expect(result).not.toBeNull();
    expect(result?.completedNewToday).toBe(5);
    expect(result?.completedDueToday).toBe(3);
  });
});

// ── getUserDailyStatsToday ────────────────────────────────────────────────────

describe("StatsService.getUserDailyStatsToday", () => {
  it("returns null when user has no dailyStats", async () => {
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    const result = await service.getUserDailyStatsToday("u1");

    expect(result).toBeNull();
  });

  it("returns null when user dailyStats were written yesterday", async () => {
    const { service, userRepo } = makeService();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        dailyStats: {
          completedNewToday: 3,
          completedDueToday: 2,
          lastUpdatedStats: yesterday,
        },
      })
    );

    const result = await service.getUserDailyStatsToday("u1");

    expect(result).toBeNull();
  });

  it("returns dailyStats when last update was today", async () => {
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        dailyStats: {
          completedNewToday: 7,
          completedDueToday: 4,
          lastUpdatedStats: new Date(),
        },
      })
    );

    const result = await service.getUserDailyStatsToday("u1");

    expect(result).not.toBeNull();
    expect(result?.completedNewToday).toBe(7);
    expect(result?.completedDueToday).toBe(4);
  });
});

// ── aggregateUserStats ────────────────────────────────────────────────────────

describe("StatsService.aggregateUserStats", () => {
  it("computes totalCards and totalDecks from user's deck list", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    userRepo.seedDecks("u1", [
      makeDeck({ id: "d1", cardsNum: 10 }),
      makeDeck({ id: "d2", cardsNum: 15 }),
      makeDeck({ id: "d3", cardsNum: 5 }),
    ]);

    // Act
    await service.aggregateUserStats("u1");

    // Assert
    const user = await userRepo.getUser("u1");
    expect((user as any)?.stats?.totalCards).toBe(30);
    expect((user as any)?.stats?.totalDecks).toBe(3);
  });

  it("writes 0 counts when user has no decks", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    userRepo.seedDecks("u1", []);

    // Act
    await service.aggregateUserStats("u1");

    // Assert
    const user = await userRepo.getUser("u1");
    expect((user as any)?.stats?.totalCards).toBe(0);
    expect((user as any)?.stats?.totalDecks).toBe(0);
  });
});
