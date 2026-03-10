import { RankingService } from "../../src/services/RankingService";
import { InMemoryRankingRepository } from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";

function makeService() {
  const repo = new InMemoryRankingRepository();
  const service = new RankingService(repo);
  return { service, repo };
}

// ── getLeaderboard ────────────────────────────────────────────────────────────

describe("RankingService.getLeaderboard", () => {
  it("returns empty entries when user has no season points", async () => {
    // Arrange
    const { service } = makeService();

    // Act
    const result = await service.getLeaderboard("u1");

    // Assert
    expect(result.entries).toHaveLength(0);
    expect(result.groupId).toBeNull();
    expect(result.leagueNumber).toBeNull();
  });

  it("returns empty entries when user has points but no group", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedSeasonPoints("season-1", "u1", {
      league: 2,
      points: 100,
      groupId: undefined,
    } as any);

    // Act
    const result = await service.getLeaderboard("u1");

    // Assert
    expect(result.entries).toHaveLength(0);
    expect(result.leagueNumber).toBe(2);
    expect(result.groupId).toBeNull();
  });

  it("returns leaderboard entries for group members", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedSeasonPoints("season-1", "u1", {
      league: 1,
      points: 80,
      groupId: "group-1",
    } as any);
    repo.seedGroupMembers("season-1", 1, "group-1", [
      { userId: "u1", points: 80, lastActivityAt: null },
      { userId: "u2", points: 50, lastActivityAt: null },
    ]);
    repo.seedUser("u1", makeUser({ id: "u1", username: "alice" }));
    repo.seedUser("u2", makeUser({ id: "u2", username: "bob" }));

    // Act
    const result = await service.getLeaderboard("u1");

    // Assert
    expect(result.entries).toHaveLength(2);
    expect(result.totalMembers).toBe(2);
    expect(result.entries[0].userId).toBe("u1");
    expect(result.entries[0].position).toBe(1);
  });
});

// ── getUserRanking ────────────────────────────────────────────────────────────

describe("RankingService.getUserRanking", () => {
  it("returns null position when user has no season points", async () => {
    // Arrange
    const { service } = makeService();

    // Act
    const result = await service.getUserRanking("u1");

    // Assert
    expect(result.position).toBeNull();
    expect(result.points).toBe(0);
  });

  it("calculates correct position based on members with more points", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedSeasonPoints("season-1", "u1", {
      league: 1,
      points: 60,
      groupId: "group-1",
    } as any);
    repo.seedGroupMembers("season-1", 1, "group-1", [
      { userId: "u-top", points: 100, lastActivityAt: null },
      { userId: "u1", points: 60, lastActivityAt: null },
      { userId: "u-low", points: 20, lastActivityAt: null },
    ]);

    // Act
    const result = await service.getUserRanking("u1");

    // Assert
    expect(result.position).toBe(2); // 1 user has more points
    expect(result.points).toBe(60);
    expect(result.totalMembers).toBe(3);
  });
});

// ── getFollowingRankings ──────────────────────────────────────────────────────

describe("RankingService.getFollowingRankings", () => {
  it("returns empty rankings when user follows nobody", async () => {
    // Arrange
    const { service } = makeService();

    // Act
    const result = await service.getFollowingRankings("u1");

    // Assert
    expect(result.rankings).toHaveLength(0);
  });

  it("returns rankings for followed users", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedFollowing("u1", [{ userId: "friend-1" } as any]);
    repo.seedSeasonPoints("season-1", "friend-1", {
      league: 2,
      points: 75,
      groupId: "group-2",
    } as any);
    repo.seedGroupMembers("season-1", 2, "group-2", [
      { userId: "friend-1", points: 75, lastActivityAt: null },
    ]);
    repo.seedUser("friend-1", makeUser({ id: "friend-1", username: "friend" }));

    // Act
    const result = await service.getFollowingRankings("u1");

    // Assert
    expect(result.rankings).toHaveLength(1);
    expect(result.rankings[0].userId).toBe("friend-1");
    expect(result.rankings[0].points).toBe(75);
  });

  it("filters out followed users with no season data", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedFollowing("u1", [
      { userId: "friend-no-data" } as any,
    ]);
    // No seed for friend-no-data → getUserSeasonPoints returns null

    // Act
    const result = await service.getFollowingRankings("u1");

    // Assert
    expect(result.rankings).toHaveLength(0);
  });
});

// ── assignUserToGroup ─────────────────────────────────────────────────────────

describe("RankingService.assignUserToGroup", () => {
  it("throws when user does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(
      service.assignUserToGroup("nonexistent", 1, "season-1")
    ).rejects.toThrow();
  });

  it("assigns existing user to a group and returns groupId", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedUser("u1", makeUser({ id: "u1", league: 2 }));
    repo.seedSeasonPoints("season-1", "u1", { points: 30 } as any);
    repo.setNextGroupId("assigned-group");

    // Act
    const result = await service.assignUserToGroup("u1", 2, "season-1");

    // Assert
    expect(result.success).toBe(true);
    expect(result.groupId).toBe("assigned-group");
  });
});
