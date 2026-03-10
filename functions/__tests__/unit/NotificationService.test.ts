import { NotificationService } from "../../src/services/NotificationService";
import { InMemoryNotificationRepository } from "./helpers/inMemoryRepositories";
import { makeNotification } from "./helpers/factories";

function makeService() {
  const repo = new InMemoryNotificationRepository();
  const service = new NotificationService(repo);
  return { service, repo };
}

// ── create ────────────────────────────────────────────────────────────────────

describe("NotificationService.create", () => {
  it("delegates to repo with correct fields", async () => {
    const { service, repo } = makeService();

    const id = await service.create("u1", {
      title: "Hello",
      body: "World",
      type: "info",
    });

    expect(repo.createCallCount).toBe(1);
    expect(repo.lastCreatedUserId).toBe("u1");
    expect(repo.lastCreatedNotification).toMatchObject({
      title: "Hello",
      body: "World",
      type: "info",
    });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("defaults linkTo to null and read to false when omitted", async () => {
    const { service, repo } = makeService();

    await service.create("u1", { title: "T", body: "B", type: "success" });

    expect(repo.lastCreatedNotification?.linkTo).toBeNull();
    expect(repo.lastCreatedNotification?.read).toBe(false);
  });
});

// ── notifyStreakBroken ────────────────────────────────────────────────────────

describe("NotificationService.notifyStreakBroken", () => {
  it("creates a warning notification", async () => {
    const { service, repo } = makeService();

    await service.notifyStreakBroken("u1");

    expect(repo.createCallCount).toBe(1);
    expect(repo.lastCreatedNotification?.type).toBe("warning");
    expect(repo.lastCreatedUserId).toBe("u1");
  });
});

// ── notifySeasonEnd ───────────────────────────────────────────────────────────

describe("NotificationService.notifySeasonEnd", () => {
  it("includes position and advancement for top-3 in non-max league", async () => {
    const { service, repo } = makeService();

    await service.notifySeasonEnd({ userId: "u1", finalPosition: 1, leagueNumber: 5 });

    expect(repo.lastCreatedNotification?.body).toContain("1st");
    expect(repo.lastCreatedNotification?.body).toContain("League 6");
  });

  it("uses generic message for top-3 at max league (15)", async () => {
    const { service, repo } = makeService();

    await service.notifySeasonEnd({ userId: "u1", finalPosition: 2, leagueNumber: 15 });

    expect(repo.lastCreatedNotification?.body).toBe("Season ended! Check your final ranking.");
  });

  it("uses generic message for position outside top-3", async () => {
    const { service, repo } = makeService();

    await service.notifySeasonEnd({ userId: "u1", finalPosition: 5, leagueNumber: 3 });

    expect(repo.lastCreatedNotification?.body).toBe("Season ended! Check your final ranking.");
  });

  it("uses generic message when no position provided", async () => {
    const { service, repo } = makeService();

    await service.notifySeasonEnd({ userId: "u1" });

    expect(repo.lastCreatedNotification?.body).toBe("Season ended! Check your final ranking.");
    expect(repo.lastCreatedNotification?.type).toBe("info");
  });

  it("formats 2nd and 3rd place correctly", async () => {
    const { service, repo } = makeService();
    await service.notifySeasonEnd({ userId: "u1", finalPosition: 2, leagueNumber: 3 });
    expect(repo.lastCreatedNotification?.body).toContain("2nd");

    await service.notifySeasonEnd({ userId: "u1", finalPosition: 3, leagueNumber: 3 });
    expect(repo.lastCreatedNotification?.body).toContain("3rd");
  });
});

// ── notifyLeagueAdvance ───────────────────────────────────────────────────────

describe("NotificationService.notifyLeagueAdvance", () => {
  it("creates a success notification with the target league", async () => {
    const { service, repo } = makeService();

    await service.notifyLeagueAdvance("u1", 2, 3);

    expect(repo.lastCreatedNotification?.type).toBe("success");
    expect(repo.lastCreatedNotification?.body).toContain("League 3");
  });
});

// ── markRead ──────────────────────────────────────────────────────────────────

describe("NotificationService.markRead", () => {
  it("delegates to repo", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", [makeNotification({ id: "n1" })]);

    await service.markRead("u1", "n1");

    expect(repo.markReadCallCount).toBe(1);
  });
});
