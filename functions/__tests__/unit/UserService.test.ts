import { UserService } from "../../src/services/UserService";
import { InMemoryUserRepository } from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";

function makeService() {
  const userRepo = new InMemoryUserRepository();
  const service = new UserService(userRepo);
  return { service, userRepo };
}

// ── getPublicUserProfile ──────────────────────────────────────────────────────

describe("UserService.getPublicUserProfile", () => {
  it("throws not-found when target user does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(
      service.getPublicUserProfile("caller-1", "nonexistent")
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("returns user and isFollowing=false when caller does not follow", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("target", makeUser({ id: "target", username: "alice" }));

    // Act
    const result = await service.getPublicUserProfile("caller", "target");

    // Assert
    expect(result.user.id).toBe("target");
    expect(result.isFollowing).toBe(false);
  });

  it("returns isFollowing=true when caller already follows target", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("target", makeUser({ id: "target" }));
    await userRepo.toggleFollow("caller", "target"); // set following state

    // Act
    const result = await service.getPublicUserProfile("caller", "target");

    // Assert
    expect(result.isFollowing).toBe(true);
  });
});

// ── toggleFollow ──────────────────────────────────────────────────────────────

describe("UserService.toggleFollow", () => {
  it("throws not-found when target user does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(
      service.toggleFollow("caller", "nonexistent")
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("follows an unfollowed user", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("target", makeUser({ id: "target" }));

    // Act
    const result = await service.toggleFollow("caller", "target");

    // Assert
    expect(result.isFollowing).toBe(true);
  });

  it("unfollows an already-followed user", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("target", makeUser({ id: "target" }));
    await userRepo.toggleFollow("caller", "target"); // pre-follow

    // Act
    const result = await service.toggleFollow("caller", "target");

    // Assert
    expect(result.isFollowing).toBe(false);
  });
});

// ── findByUsername ────────────────────────────────────────────────────────────

describe("UserService.findByUsername", () => {
  it("returns null when username not found", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(service.findByUsername("nobody")).resolves.toBeNull();
  });

  it("finds user by exact username", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "alice" }));

    // Act
    const result = await service.findByUsername("alice");

    // Assert
    expect(result).toBe("u1");
  });

  it("normalizes username to lowercase before searching", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "alice" }));

    // Act
    const result = await service.findByUsername("ALICE");

    // Assert
    expect(result).toBe("u1");
  });
});

// ── aggregateStats (via UserService.getActivityHeatmap) ──────────────────────

describe("UserService.getActivityHeatmap", () => {
  it("returns empty heatmap data for user with no activity", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    // Act
    const result = await service.getActivityHeatmap("u1", 4);

    // Assert
    expect(result).toHaveLength(4 * 7); // 4 weeks × 7 days
    result.forEach((entry) => expect(entry.count).toBe(0));
  });
});
