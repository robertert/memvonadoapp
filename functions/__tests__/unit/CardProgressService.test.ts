import { CardProgressService } from "../../src/services/CardProgressService";
import {
  InMemoryCardRepository,
  InMemoryUserRepository,
  InMemoryStatsRepository,
} from "./helpers/inMemoryRepositories";
import {
  makeNewCard,
  makeCardAlgo,
  makeFirstLearn,
} from "./helpers/factories";

function makeService() {
  const cardRepo = new InMemoryCardRepository();
  const userRepo = new InMemoryUserRepository();
  const statsRepo = new InMemoryStatsRepository();
  const service = new CardProgressService(cardRepo, userRepo, statsRepo);
  return { service, cardRepo, userRepo, statsRepo };
}

const SCHEDULED_MS = 60_000; // 1 minute

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

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "forward");

    expect(updated.firstLearn?.due).toBeDefined();
    const dueMs = updated.firstLearn!.due!.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + SCHEDULED_MS);
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

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "forward");

    expect(updated.cardAlgo?.due).toBeDefined();
    const dueMs = updated.cardAlgo!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + SCHEDULED_MS);
  });

  it("forward + no cardAlgo yet → initialises cardAlgo with default then updates due", () => {
    const before = Date.now();
    const card = makeNewCard("c3", {
      firstLearn: makeFirstLearn({ isNew: false, isFirst: false }),
      // no cardAlgo
    });

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "forward");

    expect(updated.cardAlgo?.due).toBeDefined();
    const dueMs = updated.cardAlgo!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED_MS);
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

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "reverse");

    expect(updated.firstLearnReverse?.due).toBeDefined();
    const dueMs = updated.firstLearnReverse!.due!.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + SCHEDULED_MS);
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

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "reverse");

    expect(updated.cardAlgoReverse?.due).toBeDefined();
    const dueMs = updated.cardAlgoReverse!.due.getTime();
    expect(dueMs).toBeGreaterThanOrEqual(before + SCHEDULED_MS);
    expect(dueMs).toBeLessThanOrEqual(Date.now() + SCHEDULED_MS);
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

    const updated = service._computeUpdatedCard(card, SCHEDULED_MS, "forward");

    expect(updated.id).toBe("c7");
    expect(updated.cardData.front).toBe("Front c7");
    expect(updated.cardData.back).toBe("Back c7");
  });
});
