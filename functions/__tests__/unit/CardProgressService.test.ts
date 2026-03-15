import { CardProgressService } from "../../src/services/CardProgressService";
import {
  InMemoryCardRepository,
  InMemoryUserRepository,
  InMemoryStatsRepository,
} from "./helpers/inMemoryRepositories";
import {
  makeNewCard,
  makeCardAlgo,
  makeDailyStats,
  makeFirstLearn,
  makeUser,
} from "./helpers/factories";

function makeService() {
  const cardRepo = new InMemoryCardRepository();
  const userRepo = new InMemoryUserRepository();
  const statsRepo = new InMemoryStatsRepository();
  const service = new CardProgressService(cardRepo, userRepo, statsRepo);
  return { service, cardRepo, userRepo, statsRepo };
}

const ONE_MINUTE_MS = 60_000;

describe("CardProgressService._computeUpdatedCard", () => {
  let service: CardProgressService;

  beforeEach(() => {
    ({ service } = makeService());
  });

  // -------------------------------------------------------------------------
  // Forward direction
  // -------------------------------------------------------------------------

  it("forward + firstLearn.isFirst → updates firstLearn.due", () => {
    const before = Date.now();
    const card = makeNewCard("c1", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: true }),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "forward");

    expect(updated.firstLearn?.due).toBeDefined();
    const dueMs = updated.firstLearn!.due!.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_MINUTE_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + ONE_MINUTE_MS);
    // cardAlgo should be unchanged (not set)
    expect(updated.cardAlgo).toBeUndefined();
  });

  it("forward + graduated (isFirst=false) → updates cardAlgo.due", () => {
    const before = Date.now();
    const pastDue = new Date(Date.now() - 86_400_000);
    const card = makeNewCard("c2", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo({ due: pastDue }),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "forward");

    expect(updated.cardAlgo?.due).toBeDefined();
    const dueMs = updated.cardAlgo!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_MINUTE_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + ONE_MINUTE_MS);
  });

  it("forward + no cardAlgo yet → initialises cardAlgo with default then updates due", () => {
    const before = Date.now();
    const card = makeNewCard("c3", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      // no cardAlgo
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "forward");

    expect(updated.cardAlgo?.due).toBeDefined();
    const dueMs = updated.cardAlgo!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_MINUTE_MS);
  });

  // -------------------------------------------------------------------------
  // Reverse direction
  // -------------------------------------------------------------------------

  it("reverse + firstLearnReverse.isFirst → updates firstLearnReverse.due", () => {
    const before = Date.now();
    const card = makeNewCard("c4", {
      firstLearn: makeFirstLearn({ isNew: false }),
      firstLearnReverse: makeFirstLearn({ isNew: false, isFirst: true }),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "reverse");

    expect(updated.firstLearnReverse?.due).toBeDefined();
    const dueMs = updated.firstLearnReverse!.due!.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_MINUTE_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + ONE_MINUTE_MS);
    // cardAlgoReverse should be unchanged
    expect(updated.cardAlgoReverse).toBeUndefined();
  });

  it("reverse + graduated reverse (isFirst=false) → updates cardAlgoReverse.due", () => {
    const before = Date.now();
    const pastDue = new Date(Date.now() - 86_400_000);
    const card = makeNewCard("c5", {
      firstLearn: makeFirstLearn({ isNew: false }),
      firstLearnReverse: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgoReverse: makeCardAlgo({ due: pastDue }),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "reverse");

    expect(updated.cardAlgoReverse?.due).toBeDefined();
    const dueMs = updated.cardAlgoReverse!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + ONE_MINUTE_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + ONE_MINUTE_MS);
  });

  it("forward + isFirst: preserves consecutiveGood unchanged", () => {
    const card = makeNewCard("c8", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: true, consecutiveGood: 2 }),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "forward");

    expect(updated.firstLearn?.consecutiveGood).toBe(2);
  });

  it("forward + isFirst: due is set to approximately now + scheduledTime", () => {
    const before = Date.now();
    const SCHEDULED = 5 * 60_000; // 5 minutes
    const card = makeNewCard("c9", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: true }),
    });

    const updated = service._computeUpdatedCard(card, SCHEDULED, "forward");

    const dueMs = updated.firstLearn!.due!.getTime();
    const after = Date.now();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED);
    expect(dueMs).toBeLessThanOrEqual(after + SCHEDULED);
  });

  it("reverse + isFirst: due is set to approximately now + scheduledTime", () => {
    const before = Date.now();
    const SCHEDULED = 10 * 60_000; // 10 minutes
    const card = makeNewCard("c10", {
      firstLearn: makeFirstLearn({ isNew: false }),
      firstLearnReverse: makeFirstLearn({ isNew: false, isFirst: true }),
    });

    const updated = service._computeUpdatedCard(card, SCHEDULED, "reverse");

    const dueMs = updated.firstLearnReverse!.due!.getTime();
    const after = Date.now();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED);
    expect(dueMs).toBeLessThanOrEqual(after + SCHEDULED);
  });

  it("scheduledTime applied correctly — larger offset produces later due date", () => {
    const card = makeNewCard("c6", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo({ due: new Date(Date.now() - 60_000) }),
    });

    const short = service._computeUpdatedCard(card, 60_000, "forward");
    const long = service._computeUpdatedCard(card, 600_000, "forward");

    expect(long.cardAlgo!.due.getTime()).toBeGreaterThan(
      short.cardAlgo!.due.getTime()
    );
  });

  it("returns a valid Card (other fields preserved)", () => {
    const card = makeNewCard("c7", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo(),
    });

    const updated = service._computeUpdatedCard(card, ONE_MINUTE_MS, "forward");

    expect(updated.id).toBe("c7");
    expect(updated.cardData.front).toBe("Front c7");
    expect(updated.cardData.back).toBe("Back c7");
  });
});

// ── updateProgress() — public API ─────────────────────────────────────────────

describe("CardProgressService.updateProgress", () => {
  it("persists updated card to repo (forward)", async () => {
    const { service, cardRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const card = makeNewCard("c1", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo({ due: new Date(Date.now() - 60_000) }),
    });
    const setCardSpy = jest.spyOn(cardRepo, "setCard");

    await service.updateProgress({
      userId: "u1",
      deckId: "d1",
      card,
      scheduledTime: 60_000,
      direction: "forward",
    });

    expect(setCardSpy).toHaveBeenCalledWith(
      "u1",
      "d1",
      expect.objectContaining({ id: "c1" })
    );
  });

  it("persists updated card to repo (reverse)", async () => {
    const { service, cardRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const card = makeNewCard("c2", {
      firstLearn: makeFirstLearn({ isNew: false }),
      firstLearnReverse: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgoReverse: makeCardAlgo({ due: new Date(Date.now() - 60_000) }),
    });
    const setCardSpy = jest.spyOn(cardRepo, "setCard");

    await service.updateProgress({
      userId: "u1",
      deckId: "d1",
      card,
      scheduledTime: 60_000,
      direction: "reverse",
    });

    expect(setCardSpy).toHaveBeenCalledWith(
      "u1",
      "d1",
      expect.objectContaining({ id: "c2" })
    );
  });

  it("updates dailyStats when dailyStats is provided", async () => {
    const { service, statsRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const card = makeNewCard("c3", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo(),
    });
    const updateStatsSpy = jest.spyOn(statsRepo, "updateDailyStats");
    const dailyStats = makeDailyStats({ completedDueToday: 5 });

    await service.updateProgress({
      userId: "u1",
      deckId: "d1",
      card,
      scheduledTime: 60_000,
      dailyStats,
    });

    expect(updateStatsSpy).toHaveBeenCalledWith("u1", "d1", dailyStats, null);
  });

  it("does not update dailyStats when dailyStats is not provided", async () => {
    const { service, statsRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const card = makeNewCard("c4", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo(),
    });
    const updateStatsSpy = jest.spyOn(statsRepo, "updateDailyStats");

    await service.updateProgress({
      userId: "u1",
      deckId: "d1",
      card,
      scheduledTime: 60_000,
      // no dailyStats
    });

    expect(updateStatsSpy).not.toHaveBeenCalled();
  });

  it("increments user's totalReviews", async () => {
    const { service, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1", stats: { totalReviews: 10 } as any }));
    const card = makeNewCard("c5", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo(),
    });

    await service.updateProgress({
      userId: "u1",
      deckId: "d1",
      card,
      scheduledTime: 60_000,
    });

    const user = await userRepo.getUser("u1");
    expect((user as any).stats.totalReviews).toBe(11);
  });
});

// ── undoCard() — public API ───────────────────────────────────────────────────

describe("CardProgressService.undoCard", () => {
  it("restores previousCard to repo", async () => {
    const { service, cardRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const current = makeNewCard("c1", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      cardAlgo: makeCardAlgo({ due: new Date(Date.now() + 86_400_000) }),
    });
    const previous = makeNewCard("c1", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: true }),
    });
    const setCardSpy = jest.spyOn(cardRepo, "setCard");

    await service.undoCard({
      userId: "u1",
      deckId: "d1",
      card: current,
      previousCard: previous,
    });

    expect(setCardSpy).toHaveBeenCalledWith("u1", "d1", previous);
  });

  it("updates dailyStats when dailyStats is provided during undo", async () => {
    const { service, statsRepo, userRepo } = makeService();
    userRepo.seed("u1", makeUser({ id: "u1" }));
    const card = makeNewCard("c2", {
      firstLearn: makeFirstLearn({ isNew: false }),
    });
    const updateStatsSpy = jest.spyOn(statsRepo, "updateDailyStats");
    const dailyStats = makeDailyStats({ completedDueToday: 3 });

    await service.undoCard({
      userId: "u1",
      deckId: "d1",
      card,
      previousCard: makeNewCard("c2"),
      dailyStats,
    });

    expect(updateStatsSpy).toHaveBeenCalledWith("u1", "d1", dailyStats, null);
  });
});
