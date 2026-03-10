import { StreakService } from "../../src/services/StreakService";
import { InMemoryUserRepository } from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";

function makeService() {
  const userRepo = new InMemoryUserRepository();
  const service = new StreakService(userRepo);
  return { service, userRepo };
}

// ── updateStreakIfQualified ───────────────────────────────────────────────────

describe("StreakService.updateStreakIfQualified", () => {
  it("returns qualified:false when daily count is below threshold", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        dailyStats: {
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          completedNewToday: 3,
          completedDueToday: 2,
          lastUpdatedStats: new Date(),
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakIfQualified("u1", 10);

    // Assert
    expect(result.qualified).toBe(false);
    expect(result.updated).toBe(false);
    expect(result.todayCount).toBe(5);
  });

  it("returns updated:false when streak already recorded today (idempotent)", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    const lastStreakDate = new Date(); // today
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 3,
          longestStreak: 5,
          lastStreakDate,
        },
        dailyStats: {
          completedNewToday: 10,
          completedDueToday: 5,
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          lastUpdatedStats: new Date(),
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakIfQualified("u1", 10);

    // Assert
    expect(result.qualified).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.currentStreak).toBe(3);
  });

  it("increments streak when threshold is met for the first time today", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 2,
          longestStreak: 2,
          lastStreakDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        dailyStats: {
          completedNewToday: 7,
          completedDueToday: 5,
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          lastUpdatedStats: new Date(),
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakIfQualified("u1", 10);

    // Assert
    expect(result.qualified).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("updates longestStreak when new streak exceeds previous best", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 5,
          longestStreak: 5,
        },
        dailyStats: {
          completedNewToday: 10,
          completedDueToday: 5,
          newCardsRemaining: 0,
          dueCardsRemaining: 0,
          inProgressDueCards: 0,
          inProgressNewCards: 0,
          lastUpdatedStats: new Date(),
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakIfQualified("u1", 10);

    // Assert
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it("throws when user not found", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(service.updateStreakIfQualified("nonexistent")).rejects.toThrow("User not found");
  });
});

// ── updateStreakOnLogin ───────────────────────────────────────────────────────

describe("StreakService.updateStreakOnLogin", () => {
  it("returns streak_safe when streak was updated today", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 3,
          longestStreak: 5,
          lastStreakDate: new Date(), // today
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakOnLogin("u1");

    // Assert
    expect(result.status).toBe("streak_safe");
    expect(result.updated).toBe(false);
  });

  it("returns streak_safe when streak was updated yesterday", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 3,
          longestStreak: 5,
          lastStreakDate: yesterday,
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakOnLogin("u1");

    // Assert
    expect(result.status).toBe("streak_safe");
    expect(result.updated).toBe(false);
  });

  it("resets streak when last activity was more than one day ago", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 7,
          longestStreak: 10,
          lastStreakDate: threeDaysAgo,
        },
      } as any)
    );

    // Act
    const result = await service.updateStreakOnLogin("u1");

    // Assert
    expect(result.status).toBe("streak_reset");
    expect(result.updated).toBe(true);
    expect(result.currentStreak).toBe(0);
    expect(result.previousStreak).toBe(7);
  });

  it("returns streak_safe (no reset) when streak is 0 even with old lastStreakDate", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed(
      "u1",
      makeUser({
        id: "u1",
        stats: {
          totalCards: 0,
          totalDecks: 0,
          totalReviews: 0,
          currentStreak: 0,
          longestStreak: 5,
        },
      })
    );

    // Act
    const result = await service.updateStreakOnLogin("u1");

    // Assert
    expect(result.status).toBe("streak_safe");
    expect(result.updated).toBe(false);
  });
});
