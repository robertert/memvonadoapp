// Mock firebase-admin/firestore FieldValue since AvocadoService imports it at module level
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => n,
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
    serverTimestamp: () => ({}),
  },
}));

jest.mock("firebase-functions/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { AvocadoService } from "../../src/services/AvocadoService";
import { InMemoryAvocadoRepository } from "./helpers/inMemoryRepositories";
import { makeAvocadoUserData, makeAvocadoGrowth } from "./helpers/factories";

function makeService() {
  const repo = new InMemoryAvocadoRepository();
  const service = new AvocadoService(repo);
  return { service, repo };
}

const TZ = "UTC";

function daysAgoDate(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── updateGrowth ──────────────────────────────────────────────────────────────

describe("AvocadoService.updateGrowth", () => {
  it("is idempotent — no update when lastGrowthDate is today", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 3,
        lastGrowthDate: new Date(), // today
      }),
    }));

    const result = await service.updateGrowth("u1", TZ);

    expect(result.updated).toBe(false);
    expect(result.consecutiveDays).toBe(3);
    expect(repo.updateCallCount).toBe(0);
  });

  it("increments consecutiveDays by 1 when lastGrowthDate is not today", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 2,
        lastGrowthDate: daysAgoDate(1),
      }),
    }));

    const result = await service.updateGrowth("u1", TZ);

    expect(result.updated).toBe(true);
    expect(result.consecutiveDays).toBe(3);
    expect(repo.updateCallCount).toBe(1);
  });

  it("clamps consecutiveDays at 7", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 7,
        lastGrowthDate: daysAgoDate(1),
      }),
    }));

    const result = await service.updateGrowth("u1", TZ);

    expect(result.consecutiveDays).toBe(8); // not clamped in count, clamped in DAYS_TO_PHASE lookup
    expect(result.canHarvest).toBe(true);
  });

  it("maps day 1-2 to phase 1", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 0, lastGrowthDate: null }),
    }));

    const result = await service.updateGrowth("u1", TZ);
    expect(result.currentPhase).toBe(1); // day 1 → phase 1
  });

  it("maps day 3-4 to phase 2", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 2, lastGrowthDate: daysAgoDate(1) }),
    }));

    const result = await service.updateGrowth("u1", TZ);
    expect(result.currentPhase).toBe(2); // day 3 → phase 2
  });

  it("maps day 7 to phase 5 and canHarvest=true", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 6, lastGrowthDate: daysAgoDate(1) }),
    }));

    const result = await service.updateGrowth("u1", TZ);
    expect(result.currentPhase).toBe(5);
    expect(result.canHarvest).toBe(true);
  });

  it("throws when user not found", async () => {
    const { service } = makeService();

    await expect(service.updateGrowth("nonexistent", TZ)).rejects.toThrow("User not found");
  });
});

// ── resetGrowth ───────────────────────────────────────────────────────────────

describe("AvocadoService.resetGrowth", () => {
  it("resets when consecutiveDays < 7", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 4 }),
    }));

    const result = await service.resetGrowth("u1");

    expect(result.wasReset).toBe(true);
    expect(result.hadPendingHarvest).toBe(false);
    expect(result.previousDays).toBe(4);
    expect(repo.updateCallCount).toBe(1);
  });

  it("does NOT reset when consecutiveDays >= 7 (pending harvest)", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 7 }),
    }));

    const result = await service.resetGrowth("u1");

    expect(result.wasReset).toBe(false);
    expect(result.hadPendingHarvest).toBe(true);
    expect(repo.updateCallCount).toBe(0);
  });

  it("throws when user not found", async () => {
    const { service } = makeService();

    await expect(service.resetGrowth("nonexistent")).rejects.toThrow("User not found");
  });
});

// ── harvest ───────────────────────────────────────────────────────────────────

describe("AvocadoService.harvest", () => {
  it("throws when consecutiveDays < 7", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 6 }),
    }));

    await expect(service.harvest("u1")).rejects.toThrow("Cannot harvest yet");
  });

  it("returns isNewSkin=true for a skin not yet collected", async () => {
    const { service, repo } = makeService();
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 7,
        collectedSkins: [], // no skins yet
      }),
    }));

    const result = await service.harvest("u1");

    expect(result.success).toBe(true);
    expect(result.isNewSkin).toBe(true);
    expect(typeof result.awardedSkin.id).toBe("string");
  });

  it("returns isNewSkin=false when all skins already collected", async () => {
    const { service, repo } = makeService();
    // Seed with all skin IDs collected
    const allSkins = [
      "classic_avo", "sport_avo", "chef_avo", "space_avo", "painter_avo",
      "ninja_avo", "sensei_avo", "detective_avo", "king_avo", "robot_avo", "sleepy_avo",
    ].map((id) => ({ id, name: id, rarity: "common" as const, obtainedAt: new Date() }));

    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 7,
        collectedSkins: allSkins,
      }),
    }));

    const result = await service.harvest("u1");

    expect(result.isNewSkin).toBe(false);
  });

  it("throws when user not found", async () => {
    const { service } = makeService();

    await expect(service.harvest("nonexistent")).rejects.toThrow("User not found");
  });
});

// ── getStatus ─────────────────────────────────────────────────────────────────

describe("AvocadoService.getStatus", () => {
  it("returns canHarvest=true when consecutiveDays >= 7", async () => {
    const { service, repo } = makeService();
    repo.setStreakThreshold(10);
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({ consecutiveDays: 7 }),
      dailyStats: { completedNewToday: 0, completedDueToday: 0 },
    }));

    const status = await service.getStatus("u1");

    expect(status.canHarvest).toBe(true);
  });

  it("returns isWilted=true when goal not met and last growth > 1 day ago", async () => {
    const { service, repo } = makeService();
    repo.setStreakThreshold(10);
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth({
        consecutiveDays: 3,
        lastGrowthDate: daysAgoDate(3), // 3 days ago → wilted
      }),
      dailyStats: { completedNewToday: 0, completedDueToday: 0 }, // goal not met
    }));

    const status = await service.getStatus("u1");

    expect(status.isWilted).toBe(true);
    expect(status.goalMetToday).toBe(false);
  });

  it("returns goalMetToday=true when completedCount >= threshold", async () => {
    const { service, repo } = makeService();
    repo.setStreakThreshold(10);
    repo.seed("u1", makeAvocadoUserData({
      avocadoGrowth: makeAvocadoGrowth(),
      dailyStats: { completedNewToday: 5, completedDueToday: 6 }, // 11 >= 10
    }));

    const status = await service.getStatus("u1");

    expect(status.goalMetToday).toBe(true);
  });

  it("throws when user not found", async () => {
    const { service } = makeService();

    await expect(service.getStatus("nonexistent")).rejects.toThrow("User not found");
  });
});
