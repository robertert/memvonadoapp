import { LearnService } from "../../src/services/LearnService";
import {
  InMemoryCardRepository,
  InMemoryDeckRepository,
  InMemoryUserRepository,
  InMemoryStatsRepository,
} from "./helpers/inMemoryRepositories";
import {
  makeNewCard,
  makeDueCard,
  makeDeck,
  makeUser,
  makeDailyStats,
} from "./helpers/factories";

function makeService() {
  const cardRepo = new InMemoryCardRepository();
  const deckRepo = new InMemoryDeckRepository();
  const userRepo = new InMemoryUserRepository();
  const statsRepo = new InMemoryStatsRepository();
  const service = new LearnService(cardRepo, deckRepo, userRepo, statsRepo);
  return { service, cardRepo, deckRepo, userRepo, statsRepo };
}

// ---------------------------------------------------------------------------
// _applyDailyLimit
// ---------------------------------------------------------------------------

describe("_applyDailyLimit", () => {
  let service: LearnService;

  beforeEach(() => {
    ({ service } = makeService());
  });

  it("clips new cards to itemLimit", () => {
    const newCards = Array.from({ length: 10 }, (_, i) => makeNewCard(`card-${i}`));
    const { newCardsStripped } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats: null,
      itemLimit: 5,
      bidirectional: false,
    });
    expect(newCardsStripped).toHaveLength(5);
  });

  it("bidirectional: floor(limit/2) physical cards", () => {
    const newCards = Array.from({ length: 10 }, (_, i) => makeNewCard(`card-${i}`));
    const { newCardsStripped } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats: null,
      itemLimit: 6,
      bidirectional: true,
    });
    // floor(6/2) = 3 physical cards → 6 items
    expect(newCardsStripped).toHaveLength(3);
  });

  it("does not clip when under limit", () => {
    const newCards = Array.from({ length: 3 }, (_, i) => makeNewCard(`card-${i}`));
    const { newCardsStripped } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats: null,
      itemLimit: 10,
      bidirectional: false,
    });
    expect(newCardsStripped).toHaveLength(3);
  });

  it("accounts for inProgressNewCards", () => {
    const newCards = Array.from({ length: 10 }, (_, i) => makeNewCard(`card-${i}`));
    const todayStats = makeDailyStats({ inProgressNewCards: 3 });
    const { newCardsStripped } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats,
      itemLimit: 5,
      bidirectional: false,
    });
    // remainingItemSlots = 5 - 3 = 2
    expect(newCardsStripped).toHaveLength(2);
  });

  it("accounts for completedNewToday", () => {
    const newCards = Array.from({ length: 10 }, (_, i) => makeNewCard(`card-${i}`));
    const todayStats = makeDailyStats({ completedNewToday: 4 });
    const { newCardsStripped } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats,
      itemLimit: 5,
      bidirectional: false,
    });
    // remainingItemSlots = 5 - 4 = 1
    expect(newCardsStripped).toHaveLength(1);
  });

  it("fresh stats: initializes newCardsRemaining and dueCardsRemaining", () => {
    const newCards = [makeNewCard("n1"), makeNewCard("n2")];
    const dueCards = [makeDueCard("d1"), makeDueCard("d2"), makeDueCard("d3")];
    const { currentStats } = service._applyDailyLimit({
      newCards,
      dueCards,
      todayStats: null,
      itemLimit: 50,
      bidirectional: false,
    });
    expect(currentStats.dueCardsRemaining).toBe(3);
    expect(currentStats.newCardsRemaining).toBe(2);
  });

  it("existing stats: preserves completedNewToday and completedDueToday", () => {
    const newCards = [makeNewCard("n1")];
    const todayStats = makeDailyStats({ completedNewToday: 7, completedDueToday: 2 });
    const { currentStats } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats,
      itemLimit: 50,
      bidirectional: false,
    });
    expect(currentStats.completedNewToday).toBe(7);
    expect(currentStats.completedDueToday).toBe(2);
  });

  it("bidirectional: newCardsRemaining counts items (2× physical cards)", () => {
    const newCards = [makeNewCard("n1"), makeNewCard("n2"), makeNewCard("n3")];
    const { currentStats } = service._applyDailyLimit({
      newCards,
      dueCards: [],
      todayStats: null,
      itemLimit: 50,
      bidirectional: true,
    });
    expect(currentStats.newCardsRemaining).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// _interleaveItems
// ---------------------------------------------------------------------------

describe("_interleaveItems", () => {
  let service: LearnService;

  beforeEach(() => {
    ({ service } = makeService());
  });

  const fwd = (id: string) => ({
    card: makeNewCard(id),
    direction: "forward" as const,
  });
  const rev = (id: string) => ({
    card: makeNewCard(id),
    direction: "reverse" as const,
  });

  it("alternates forward and reverse", () => {
    const result = service._interleaveItems(
      [fwd("a"), fwd("b")],
      [rev("a"), rev("b")]
    );
    expect(result.map((i) => i.direction)).toEqual([
      "forward",
      "reverse",
      "forward",
      "reverse",
    ]);
  });

  it("handles unequal lengths (more forward)", () => {
    const result = service._interleaveItems(
      [fwd("a"), fwd("b"), fwd("c")],
      [rev("a")]
    );
    expect(result).toHaveLength(4);
    expect(result[0].direction).toBe("forward");
    expect(result[1].direction).toBe("reverse");
    expect(result[2].direction).toBe("forward");
    expect(result[3].direction).toBe("forward");
  });

  it("handles unequal lengths (more reverse)", () => {
    const result = service._interleaveItems(
      [fwd("a")],
      [rev("a"), rev("b"), rev("c")]
    );
    expect(result).toHaveLength(4);
    expect(result[0].direction).toBe("forward");
    expect(result[1].direction).toBe("reverse");
    expect(result[2].direction).toBe("reverse");
    expect(result[3].direction).toBe("reverse");
  });

  it("returns empty for two empty arrays", () => {
    const result = service._interleaveItems([], []);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// startSession (in-memory repos)
// ---------------------------------------------------------------------------

describe("startSession (in-memory)", () => {
  const USER_ID = "user-1";
  const DECK_ID = "deck-1";

  it("returns forward-only items in non-bidirectional mode", async () => {
    const { service, cardRepo, deckRepo, userRepo } = makeService();
    deckRepo.seed(USER_ID, DECK_ID, makeDeck({ id: DECK_ID }));
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [
      makeNewCard("n1"),
      makeNewCard("n2"),
      makeDueCard("d1"),
    ]);

    const result = await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    expect(result.items.every((i) => i.direction === "forward")).toBe(true);
    expect(result.items).toHaveLength(3);
  });

  it("due cards appear before new cards in forward-only mode", async () => {
    const { service, cardRepo, deckRepo, userRepo } = makeService();
    deckRepo.seed(USER_ID, DECK_ID, makeDeck({ id: DECK_ID }));
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [
      makeNewCard("n1"),
      makeDueCard("d1"),
    ]);

    const result = await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    expect(result.items[0].card.id).toBe("d1");
    expect(result.items[1].card.id).toBe("n1");
  });

  it("returns interleaved forward and reverse items in bidirectional mode", async () => {
    const { service, cardRepo, deckRepo, userRepo } = makeService();
    deckRepo.seed(
      USER_ID,
      DECK_ID,
      makeDeck({
        id: DECK_ID,
        settings: { zenMode: false, shuffleNewCards: false, bidirectional: true },
      })
    );
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [makeNewCard("n1"), makeNewCard("n2")]);

    const result = await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    const directions = result.items.map((i) => i.direction);
    expect(directions).toContain("forward");
    expect(directions).toContain("reverse");
    // 2 new cards → 2 forward + 2 reverse = 4 items interleaved
    expect(result.items).toHaveLength(4);
  });

  it("throws when deck not found", async () => {
    const { service } = makeService();
    await expect(
      service.startSession({ userId: USER_ID, deckId: "no-such-deck" })
    ).rejects.toThrow("Deck not found");
  });

  it("resets stats when lastUpdatedStats is from a previous day", async () => {
    const { service, cardRepo, deckRepo, userRepo, statsRepo } = makeService();
    deckRepo.seed(USER_ID, DECK_ID, makeDeck({ id: DECK_ID }));
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [makeNewCard("n1")]);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await statsRepo.setDeckDailyStats(
      USER_ID,
      DECK_ID,
      makeDailyStats({ completedNewToday: 5, completedDueToday: 3, lastUpdatedStats: yesterday })
    );

    const result = await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    expect(result.dailyStats.completedNewToday).toBe(0);
    expect(result.dailyStats.completedDueToday).toBe(0);
  });

  it("preserves stats when lastUpdatedStats is today", async () => {
    const { service, cardRepo, deckRepo, userRepo, statsRepo } = makeService();
    deckRepo.seed(USER_ID, DECK_ID, makeDeck({ id: DECK_ID }));
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [makeNewCard("n1")]);

    await statsRepo.setDeckDailyStats(
      USER_ID,
      DECK_ID,
      makeDailyStats({ completedNewToday: 3, completedDueToday: 2, lastUpdatedStats: new Date() })
    );

    const result = await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    expect(result.dailyStats.completedNewToday).toBe(3);
    expect(result.dailyStats.completedDueToday).toBe(2);
  });

  it("persists daily stats after session", async () => {
    const { service, cardRepo, deckRepo, userRepo, statsRepo } = makeService();
    deckRepo.seed(USER_ID, DECK_ID, makeDeck({ id: DECK_ID }));
    userRepo.seed(USER_ID, makeUser({ id: USER_ID }));
    cardRepo.seed(USER_ID, DECK_ID, [makeNewCard("n1"), makeDueCard("d1")]);

    await service.startSession({ userId: USER_ID, deckId: DECK_ID });

    const saved = await statsRepo.getDeckDailyStats(USER_ID, DECK_ID);
    expect(saved).not.toBeNull();
    expect(saved!.newCardsRemaining).toBe(1);
    expect(saved!.dueCardsRemaining).toBe(1);
  });
});
