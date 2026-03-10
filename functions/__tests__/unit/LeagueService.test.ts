import { LeagueService } from "../../src/services/LeagueService";
import { InMemoryLeagueRepository } from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";

function makeService() {
  const repo = new InMemoryLeagueRepository();
  const service = new LeagueService(repo);
  return { service, repo };
}

// ── getLeagueInfo ─────────────────────────────────────────────────────────────

describe("LeagueService.getLeagueInfo", () => {
  it("returns info for a valid league number (1)", () => {
    // Arrange
    const { service } = makeService();

    // Act
    const { league } = service.getLeagueInfo(1);

    // Assert
    expect(league.id).toBe(1);
    expect(league.name).toBe("Liga 1");
    expect(league.color).toBeDefined();
  });

  it("returns info for the highest valid league (15)", () => {
    // Arrange
    const { service } = makeService();

    // Act
    const { league } = service.getLeagueInfo(15);

    // Assert
    expect(league.id).toBe(15);
    expect(league.name).toBe("Liga 15");
  });

  it("throws for an invalid league number (0)", () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    expect(() => service.getLeagueInfo(0)).toThrow();
  });

  it("throws for an out-of-range league number (16)", () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    expect(() => service.getLeagueInfo(16)).toThrow();
  });
});

// ── getAllLeaguesInfo ─────────────────────────────────────────────────────────

describe("LeagueService.getAllLeaguesInfo", () => {
  it("returns all 15 leagues", () => {
    // Arrange
    const { service } = makeService();

    // Act
    const { leagues } = service.getAllLeaguesInfo();

    // Assert
    expect(leagues).toHaveLength(15);
    expect(leagues[0].id).toBe(1);
    expect(leagues[14].id).toBe(15);
  });
});

// ── getUserGroup ──────────────────────────────────────────────────────────────

describe("LeagueService.getUserGroup", () => {
  it("returns null groupId when user is not in any season", async () => {
    // Arrange
    const { service } = makeService();
    // No seed — user has no season points

    // Act
    const result = await service.getUserGroup("u1");

    // Assert
    expect(result.groupId).toBeNull();
    expect(result.leagueNumber).toBeNull();
    expect(result.memberCount).toBe(0);
  });

  it("returns group info when user is in a group", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedSeasonPoints("season-1", "u1", {
      groupId: "group-1",
      league: 3,
      points: 100,
    } as any);
    repo.seedGroup("season-1", 3, "group-1", {
      id: "group-1",
      leagueNumber: 3,
      currentCount: 12,
      capacity: 20,
      isFull: false,
    } as any);

    // Act
    const result = await service.getUserGroup("u1");

    // Assert
    expect(result.groupId).toBe("group-1");
    expect(result.leagueNumber).toBe(3);
    expect(result.memberCount).toBe(12);
  });

  it("returns null groupId when user has season points but no group assigned", async () => {
    // Arrange
    const { service, repo } = makeService();
    repo.seedSeasonPoints("season-1", "u1", {
      groupId: undefined,
      league: 2,
      points: 0,
    } as any);

    // Act
    const result = await service.getUserGroup("u1");

    // Assert
    expect(result.groupId).toBeNull();
  });
});

// ── updateUserLeague ──────────────────────────────────────────────────────────

describe("LeagueService.updateUserLeague", () => {
  it("is a no-op when user is already in the target league", async () => {
    // Arrange
    const { service, repo } = makeService();
    const user = makeUser({ id: "u1", league: 3 });
    repo.seedUser("u1", user);

    // Act
    const result = await service.updateUserLeague("u1", 3);

    // Assert
    expect(result.success).toBe(true);
    expect(result.league).toBe(3);
  });

  it("throws not-found when user does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(service.updateUserLeague("nonexistent", 5)).rejects.toThrow();
  });

  it("transitions user to a new league and assigns to a group", async () => {
    // Arrange
    const { service, repo } = makeService();
    const user = makeUser({ id: "u1", league: 1 });
    repo.seedUser("u1", user);
    repo.seedSeasonPoints("season-1", "u1", {
      groupId: "old-group",
      league: 1,
      points: 50,
    } as any);
    repo.setNextGroupId("new-group-5");

    // Act
    const result = await service.updateUserLeague("u1", 5);

    // Assert
    expect(result.success).toBe(true);
    expect(result.league).toBe(5);
    expect(result.groupId).toBe("new-group-5");
  });
});
