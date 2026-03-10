import { AuthService } from "../../src/services/AuthService";
import { InMemoryUserRepository } from "./helpers/inMemoryRepositories";
import { makeUser } from "./helpers/factories";

function makeService() {
  const userRepo = new InMemoryUserRepository();
  const service = new AuthService(userRepo);
  return { service, userRepo };
}

// ── ensureUserDocument ────────────────────────────────────────────────────────

describe("AuthService.ensureUserDocument", () => {
  it("returns created:false when user already exists (idempotent)", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));

    // Act
    const result = await service.ensureUserDocument({
      uid: "u1",
      email: "existing@test.com",
    });

    // Assert
    expect(result.created).toBe(false);
    expect(await userRepo.getUser("u1")).toBeDefined();
  });

  it("creates a new user document when user does not exist", async () => {
    // Arrange
    const { service, userRepo } = makeService();

    // Act
    const result = await service.ensureUserDocument({
      uid: "u-new",
      email: "new@example.com",
      displayName: "Alice",
    });

    // Assert
    expect(result.created).toBe(true);
    const user = await userRepo.getUser("u-new");
    expect(user).not.toBeNull();
    expect(user?.id).toBe("u-new");
  });

  it("sanitizes username from displayName", async () => {
    // Arrange
    const { service, userRepo } = makeService();

    // Act
    await service.ensureUserDocument({
      uid: "u2",
      email: "test@example.com",
      displayName: "John Doe!",
    });

    // Assert
    const user = await userRepo.getUser("u2");
    expect(user?.username).toMatch(/^[a-z0-9_]+$/);
  });

  it("derives username from email when no displayName provided", async () => {
    // Arrange
    const { service, userRepo } = makeService();

    // Act
    await service.ensureUserDocument({
      uid: "u3",
      email: "alice123@example.com",
    });

    // Assert
    const user = await userRepo.getUser("u3");
    expect(user?.username).toBe("alice123");
  });
});

// ── checkUsernameAvailability ─────────────────────────────────────────────────

describe("AuthService.checkUsernameAvailability", () => {
  it("returns isAvailable:true for an unused username", async () => {
    // Arrange
    const { service } = makeService();

    // Act
    const result = await service.checkUsernameAvailability("newuser");

    // Assert
    expect(result.isAvailable).toBe(true);
  });

  it("returns isAvailable:false when username is taken", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "taken_name" }));

    // Act
    const result = await service.checkUsernameAvailability("taken_name");

    // Assert
    expect(result.isAvailable).toBe(false);
  });

  it("normalizes username to lowercase before checking", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "alice" }));

    // Act
    const result = await service.checkUsernameAvailability("ALICE");

    // Assert
    expect(result.isAvailable).toBe(false);
  });
});

// ── completeOnboarding ────────────────────────────────────────────────────────

describe("AuthService.completeOnboarding", () => {
  it("throws already-exists when username is taken by another user", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("other-user", makeUser({ id: "other-user", username: "takenname" }));

    // Act & Assert
    await expect(
      service.completeOnboarding({
        uid: "u1",
        email: "u1@test.com",
        username: "takenname",
        interests: [],
      })
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("allows user to keep their own username during onboarding", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "myname" }));

    // Act & Assert
    await expect(
      service.completeOnboarding({
        uid: "u1",
        email: "u1@test.com",
        username: "myname",
        interests: ["music"],
      })
    ).resolves.toBeUndefined();
  });

  it("updates existing user when profile is being completed", async () => {
    // Arrange
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", username: "oldname" }));

    // Act
    await service.completeOnboarding({
      uid: "u1",
      email: "u1@test.com",
      username: "newname",
      interests: ["coding"],
    });

    // Assert
    const user = await userRepo.getUser("u1");
    expect(user?.username).toBe("newname");
  });

  it("creates a new user document when user does not exist yet", async () => {
    // Arrange
    const { service, userRepo } = makeService();

    // Act
    await service.completeOnboarding({
      uid: "u-brand-new",
      email: "new@test.com",
      username: "brandnew",
      interests: ["art"],
    });

    // Assert
    const user = await userRepo.getUser("u-brand-new");
    expect(user).not.toBeNull();
    expect(user?.username).toBe("brandnew");
  });
});
