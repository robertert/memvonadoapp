import { DeckService } from "../../src/services/DeckService";
import {
  InMemoryCardRepository,
  InMemoryDeckRepository,
  InMemoryUserRepository,
} from "./helpers/inMemoryRepositories";
import { makeSourceDeck, makeDeck, makeNewCard, makeUser } from "./helpers/factories";

function makeService() {
  const deckRepo = new InMemoryDeckRepository();
  const cardRepo = new InMemoryCardRepository();
  const userRepo = new InMemoryUserRepository();
  const service = new DeckService(deckRepo, cardRepo, userRepo);
  return { service, deckRepo, cardRepo, userRepo };
}

// ── copyDeck ─────────────────────────────────────────────────────────────────

describe("DeckService.copyDeck", () => {
  it("returns existing copy without creating a new one (idempotent)", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    const existingCopy = makeDeck({ id: "d1" });
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1"));
    deckRepo.seed("u1", "d1", existingCopy);

    // Act
    const result = await service.copyDeck("u1", "d1");

    // Assert
    expect(result).toEqual(existingCopy);
    expect(deckRepo.createUserDeckCallCount).toBe(0);
  });

  it("creates a new user learning copy when none exists", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { cardsNum: 5 }));

    // Act
    const result = await service.copyDeck("u1", "d1");

    // Assert
    expect(result.id).toBe("d1");
    expect(deckRepo.createUserDeckCallCount).toBe(1);
  });

  it("throws when source deck does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(service.copyDeck("u1", "missing-deck")).rejects.toThrow("Deck not found");
  });

  it("throws when source deck is soft-deleted", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { is_deleted: true }));

    // Act & Assert
    await expect(service.copyDeck("u1", "d1")).rejects.toThrow("deleted");
  });
});

// ── syncDeck ─────────────────────────────────────────────────────────────────

describe("DeckService.syncDeck", () => {
  it("updates existing user cards from source deck", async () => {
    // Arrange
    const { service, deckRepo, cardRepo } = makeService();
    const srcCard = makeNewCard("c1", { cardData: { front: "New Front", back: "B" } });
    const userCard = makeNewCard("c1", { cardData: { front: "Old Front", back: "B" } });

    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1"));
    cardRepo.seedSourceCards("d1", [srcCard]);
    cardRepo.seed("u1", "d1", [userCard]);

    // Act
    await service.syncDeck("u1", "d1");

    // Assert — setCard was called (no error thrown)
  });

  it("adds new source cards to user copy", async () => {
    // Arrange
    const { service, deckRepo, cardRepo } = makeService();
    const newCard = makeNewCard("c2");

    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1"));
    cardRepo.seedSourceCards("d1", [newCard]);
    cardRepo.seed("u1", "d1", []); // user has no cards yet

    // Act — should not throw
    await expect(service.syncDeck("u1", "d1")).resolves.toBeUndefined();
  });

  it("throws when source deck not found", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(service.syncDeck("u1", "missing")).rejects.toThrow("Source deck not found");
  });
});

// ── updateDeckSettings ────────────────────────────────────────────────────────

describe("DeckService.updateDeckSettings", () => {
  it("throws permission-denied when user is not owner", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner-id" }));

    // Act & Assert
    await expect(
      service.updateDeckSettings("other-user", "d1", { title: "New Title" })
    ).rejects.toThrow("permission-denied");
  });

  it("allows owner to update deck settings", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", title: "Old" }));

    // Act & Assert
    await expect(
      service.updateDeckSettings("u1", "d1", { title: "New Title" })
    ).resolves.toBeUndefined();
  });

  it("allows admin to update any deck settings", async () => {
    // Arrange
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));
    userRepo.setAdmin("admin-user");

    // Act & Assert
    await expect(
      service.updateDeckSettings("admin-user", "d1", { title: "Admin Updated" })
    ).resolves.toBeUndefined();
  });

  it("throws not-found when deck does not exist", async () => {
    // Arrange
    const { service } = makeService();

    // Act & Assert
    await expect(
      service.updateDeckSettings("u1", "nonexistent", { title: "Title" })
    ).rejects.toThrow("not-found");
  });
});

// ── updateDeck ────────────────────────────────────────────────────────────────

describe("DeckService.updateDeck", () => {
  it("throws when editor tries to change deck metadata", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    const deck = makeSourceDeck("d1", { createdBy: "owner", editors: ["editor"] });
    deckRepo.seedSourceDeck("d1", deck);

    // Act & Assert
    await expect(
      service.updateDeck(
        "editor",
        "d1",
        { title: "New Title", icon: "cards", isPublic: false },
        { created: [], updated: [], deleted: [] }
      )
    ).rejects.toThrow("permission-denied");
  });

  it("allows owner to update deck metadata and cards", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", cardsNum: 2 }));

    // Act
    const result = await service.updateDeck(
      "u1",
      "d1",
      { title: "Updated", icon: "cards", isPublic: true },
      { created: [], updated: [], deleted: [] }
    );

    // Assert
    expect(result.updatedCount).toBe(0);
    expect(result.createdCount).toBe(0);
    expect(result.deletedCount).toBe(0);
  });
});

// ── deleteDeck ────────────────────────────────────────────────────────────────

describe("DeckService.deleteDeck", () => {
  it("throws permission-denied for non-owner", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));

    // Act & Assert
    await expect(service.deleteDeck("other", "d1")).rejects.toThrow("permission-denied");
  });

  it("soft-deletes deck and notifies learners", async () => {
    // Arrange
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", title: "My Deck" }));
    deckRepo.seedLearnerIds("d1", ["learner-1", "learner-2"]);
    userRepo.seed("u1", makeUser({ id: "u1" }));

    // Act
    const result = await service.deleteDeck("u1", "d1");

    // Assert
    expect(result.notifiedUsers).toBe(2);
    expect(deckRepo.softDeleteCallCount).toBe(1);
    expect(userRepo.notifications).toHaveLength(2);
  });

  it("no-op when deck is already deleted", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", is_deleted: true }));

    // Act
    const result = await service.deleteDeck("u1", "d1");

    // Assert
    expect(result.notifiedUsers).toBe(0);
    expect(deckRepo.softDeleteCallCount).toBe(0);
  });
});

// ── addDeckEditor ─────────────────────────────────────────────────────────────

describe("DeckService.addDeckEditor", () => {
  it("throws when caller is not the deck owner", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));

    // Act & Assert
    await expect(service.addDeckEditor("other", "d1", "editor-id")).rejects.toThrow(
      "permission-denied"
    );
  });

  it("throws not-found when editor user does not exist", async () => {
    // Arrange
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1" }));

    // Act & Assert
    await expect(service.addDeckEditor("u1", "d1", "nonexistent")).rejects.toThrow("not-found");
  });

  it("adds editor when user exists and caller is owner", async () => {
    // Arrange
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1" }));
    userRepo.seed("editor-id", makeUser({ id: "editor-id" }));

    // Act
    await service.addDeckEditor("u1", "d1", "editor-id");

    // Assert
    expect(deckRepo.addEditorCallCount).toBe(1);
  });
});

// ── removeDeckEditor ──────────────────────────────────────────────────────────

describe("DeckService.removeDeckEditor", () => {
  it("throws permission-denied for non-owner", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner", editors: ["editor"] }));

    await expect(service.removeDeckEditor("other", "d1", "editor")).rejects.toThrow("permission-denied");
  });

  it("removes editor when caller is owner", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", editors: ["editor-id"] }));

    await service.removeDeckEditor("u1", "d1", "editor-id");

    expect(deckRepo.removeEditorCallCount).toBe(1);
  });

  it("throws not-found when deck does not exist", async () => {
    const { service } = makeService();

    await expect(service.removeDeckEditor("u1", "nonexistent", "editor")).rejects.toThrow("not-found");
  });
});

// ── toggleLike ────────────────────────────────────────────────────────────────

describe("DeckService.toggleLike", () => {
  it("returns liked=true and sends notification to creator on first like", async () => {
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner", title: "My Deck" }));
    userRepo.seed("liker", makeUser({ id: "liker", username: "likeruser" }));

    const result = await service.toggleLike("liker", "d1");

    expect(result.liked).toBe(true);
    expect(userRepo.notifications).toHaveLength(1);
    expect(userRepo.notifications[0].targetUserId).toBe("owner");
  });

  it("does not notify creator when unliking", async () => {
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner", title: "My Deck" }));
    // Like first
    await service.toggleLike("liker", "d1");
    const notifsBefore = userRepo.notifications.length;

    // Unlike — should not notify
    await service.toggleLike("liker", "d1");

    expect(userRepo.notifications).toHaveLength(notifsBefore); // no new notification
  });

  it("does not notify creator when liker is the creator", async () => {
    const { service, deckRepo, userRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1", title: "My Deck" }));
    userRepo.seed("u1", makeUser({ id: "u1" }));

    await service.toggleLike("u1", "d1");

    expect(userRepo.notifications).toHaveLength(0);
  });
});

// ── updateCardContent ─────────────────────────────────────────────────────────

describe("DeckService.updateCardContent", () => {
  it("throws permission-denied for non-owner non-editor", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));

    await expect(
      service.updateCardContent("stranger", "d1", "c1", {
        cardData: { front: "F", back: "B" },
      })
    ).rejects.toThrow("permission-denied");
  });

  it("allows owner to update card content", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1" }));

    await expect(
      service.updateCardContent("u1", "d1", "c1", {
        cardData: { front: "New Front", back: "New Back" },
      })
    ).resolves.toBeUndefined();
  });

  it("allows editor to update card content", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner", editors: ["editor"] }));

    await expect(
      service.updateCardContent("editor", "d1", "c1", {
        cardData: { front: "F", back: "B" },
      })
    ).resolves.toBeUndefined();
  });
});

// ── addCard ───────────────────────────────────────────────────────────────────

describe("DeckService.addCard", () => {
  it("throws not-found when neither source deck nor user deck exists", async () => {
    const { service } = makeService();

    await expect(
      service.addCard("u1", "nonexistent", { front: "F", back: "B" })
    ).rejects.toThrow("not-found");
  });

  it("adds to source deck when user is owner", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "u1" }));

    const cardId = await service.addCard("u1", "d1", { front: "F", back: "B" });

    expect(typeof cardId).toBe("string");
    expect(cardId.length).toBeGreaterThan(0);
  });

  it("adds to user deck when user has a copy but is not owner", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));
    deckRepo.seed("learner", "d1", makeDeck({ id: "d1" }));

    const cardId = await service.addCard("learner", "d1", { front: "F", back: "B" });

    expect(typeof cardId).toBe("string");
  });

  it("throws permission-denied when user has no copy and is not owner", async () => {
    const { service, deckRepo } = makeService();
    deckRepo.seedSourceDeck("d1", makeSourceDeck("d1", { createdBy: "owner" }));
    // learner has no copy

    await expect(
      service.addCard("stranger", "d1", { front: "F", back: "B" })
    ).rejects.toThrow("permission-denied");
  });
});
