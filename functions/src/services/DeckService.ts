import {
  DeckLearningDataSchema,
  DeckSchema,
  CardSchema,
  CardCoreUpdateSchema,
  CardGrade,
  type Deck,
  type DeckLearningData,
  type DeckSettings,
  type CardCore,
} from "memvocado-types";
import type { CardRepository } from "../repositories/interfaces/CardRepository";
import type { DeckRepository } from "../repositories/interfaces/DeckRepository";
import type { UserRepository } from "../repositories/interfaces/UserRepository";

/**
 * Business logic for deck management.
 * Depends only on repository interfaces — no Firebase imports.
 */
export class DeckService {
  /**
   * @param {DeckRepository} deckRepo - Deck repository
   * @param {CardRepository} cardRepo - Card repository
   * @param {UserRepository} userRepo - User repository
   */
  constructor(
    protected readonly deckRepo: DeckRepository,
    protected readonly cardRepo: CardRepository,
    protected readonly userRepo: UserRepository
  ) {}

  // ── Permission helpers ────────────────────────────────────────────────────

  /**
   * Throws Error("permission-denied: ...") if userId does not satisfy the
   * requested role on deck. Calls userRepo.isAdmin lazily (only when primary
   * check fails), so the extra Firestore read is avoided in the common case.
   * @param {string} userId - User ID to check
   * @param {Deck} deck - Source deck
   * @param {"owner" | "editor" | "owner-or-editor"} role - Required role
   * @return {Promise<void>}
   */
  private async checkDeckPermission(
    userId: string,
    deck: Deck,
    role: "owner" | "editor" | "owner-or-editor"
  ): Promise<void> {
    const isOwner = deck.createdBy === userId;
    const isEditor = (deck.editors || []).includes(userId);

    if (role === "owner") {
      if (isOwner) return;
    } else if (role === "editor") {
      if (isEditor) return;
    } else {
      if (isOwner || isEditor) return;
    }

    if (await this.userRepo.isAdmin(userId)) return;
    throw new Error("permission-denied: User does not have permission");
  }

  // ── Existing public methods ───────────────────────────────────────────────

  /**
   * Copy a source deck into a user's learning collection.
   * Creates the DeckLearningData document and bulk-copies all cards.
   * @param {string} userId - User ID
   * @param {string} deckId - Source deck ID
   * @return {Promise<DeckLearningData>} The user's deck learning data
   */
  async copyDeck(userId: string, deckId: string): Promise<DeckLearningData> {
    const srcDeck = await this.deckRepo.getSourceDeck(deckId);
    if (!srcDeck) throw new Error("Deck not found");
    if (srcDeck.is_deleted === true) throw new Error("Deck has been deleted");

    const existing = await this.deckRepo.getUserDeck(userId, deckId);
    if (existing) return existing;

    const userDeckData = DeckLearningDataSchema.parse({
      id: deckId,
      title: srcDeck.title,
      cardsNum: srcDeck.cardsNum,
      settings: { zenMode: false, shuffleNewCards: false } as DeckSettings,
      updatedAt: srcDeck.updatedAt,
      category: srcDeck.category ?? null,
      icon: srcDeck.icon ?? null,
      tags: srcDeck.tags ?? [],
      frontLanguage: srcDeck.frontLanguage ?? null,
      backLanguage: srcDeck.backLanguage ?? null,
    });

    await this.deckRepo.createUserDeck(userId, deckId, userDeckData);
    await this.cardRepo.bulkCopyCards(deckId, userId, deckId);

    return userDeckData;
  }

  /**
   * Sync card changes from a source deck to a user's learning copy.
   * Adds new cards and updates existing card content.
   * @deprecated Use syncCards() for the full handler-level sync.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async syncDeck(userId: string, deckId: string): Promise<void> {
    const [sourceCards, userCards, srcDeck] = await Promise.all([
      this.cardRepo.getAllSourceCards(deckId),
      this.cardRepo.getAllUserCards(userId, deckId),
      this.deckRepo.getSourceDeck(deckId),
    ]);

    if (!srcDeck) throw new Error("Source deck not found");

    const sourceMap = new Map(sourceCards.map((c) => [c.id, c]));
    const userCardIds = new Set(userCards.map((c) => c.id));
    const now = new Date();

    for (const userCard of userCards) {
      const src = sourceMap.get(userCard.id);
      if (!src) continue;
      await this.cardRepo.setCard(userId, deckId, {
        ...userCard,
        cardData: {
          front: src.cardData.front || "",
          back: src.cardData.back || "",
        },
        tags: src.tags ?? [],
      });
    }

    for (const [cardId, src] of sourceMap) {
      if (userCardIds.has(cardId)) continue;
      const newCard = CardSchema.parse({
        ...src,
        id: cardId,
        cardData: {
          front: src.cardData.front || "",
          back: src.cardData.back || "",
        },
        tags: src.tags ?? [],
        createdAt: src.createdAt || now,
        firstLearn: { isNew: true, due: now },
        grade: CardGrade.NotGraded,
      });
      await this.cardRepo.setCard(userId, deckId, newCard);
    }

    await this.deckRepo.updateUserDeck(userId, deckId, {
      cardsNum: sourceMap.size,
      updatedAt: srcDeck.updatedAt || now,
    });
  }

  /**
   * Reset all learning progress for a user's deck (clears card progress + dailyStats).
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async resetDeck(userId: string, deckId: string): Promise<void> {
    await this.cardRepo.bulkResetCards(userId, deckId);
  }

  // ── New public methods ────────────────────────────────────────────────────

  /**
   * Create a source deck with its cards (batched).
   * Returns the new deck ID.
   * @param {string} userId - User ID (deck creator)
   * @param {object} deckData - Deck metadata
   * @param {CardCore[]} inputCards - Initial card list
   * @return {Promise<string>} ID of the created deck
   */
  async createDeckWithCards(
    userId: string,
    deckData: {
      title: string;
      category?: string | null;
      icon?: string;
      isPublic: boolean;
      tags?: string[];
      frontLanguage?: string | null;
      backLanguage?: string | null;
    },
    inputCards: CardCore[]
  ): Promise<string> {
    const now = new Date();
    const deck = DeckSchema.parse({
      id: "placeholder",
      title: deckData.title,
      title_lower: deckData.title.toLowerCase(),
      category: deckData.category ?? null,
      icon: deckData.icon ?? "cards",
      cardsNum: inputCards.length,
      createdBy: userId,
      createdAt: now,
      isPublic: deckData.isPublic,
      is_deleted: false,
      updatedAt: now,
      tags: deckData.tags || [],
      frontLanguage: deckData.frontLanguage ?? null,
      backLanguage: deckData.backLanguage ?? null,
    });

    const deckId = await this.deckRepo.createSourceDeck(deck);

    const cardPayloads = inputCards.map((c) => ({
      cardData: {
        front: c.cardData?.front || "",
        back: c.cardData?.back || "",
      },
      tags: Array.isArray(c.tags) ? c.tags : [],
    }));
    await this.deckRepo.bulkCreateSourceCards(deckId, cardPayloads);

    return deckId;
  }

  /**
   * Fan-out metadata changes from a source deck to all user copies.
   * Computes the diff of changed fields and delegates to the repo.
   * @param {string} deckId - Source deck ID
   * @param {Partial<Deck> | null | undefined} beforeData - Previous deck data
   * @param {Deck} afterData - Updated deck data
   * @return {Promise<void>}
   */
  async syncMetadata(
    deckId: string,
    beforeData: Partial<Deck> | null | undefined,
    afterData: Deck
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    const beforeTitle = beforeData?.title ?? "";
    const afterTitle = afterData.title ?? "";
    if (beforeTitle !== afterTitle) {
      updateData.title = afterTitle;
      updateData.title_lower = afterTitle.toLowerCase();
    }

    const beforeCategory = beforeData?.category ?? null;
    const afterCategory = afterData.category ?? null;
    if (beforeCategory !== afterCategory) {
      updateData.category = afterCategory;
    }

    const beforeIcon = beforeData?.icon ?? "cards";
    const afterIcon = afterData.icon ?? "cards";
    if (beforeIcon !== afterIcon) {
      updateData.icon = afterIcon;
    }

    const beforeTags = Array.isArray(beforeData?.tags)
      ? [...(beforeData.tags as string[])].sort()
      : [];
    const afterTags = Array.isArray(afterData.tags)
      ? [...afterData.tags].sort()
      : [];
    if (JSON.stringify(beforeTags) !== JSON.stringify(afterTags)) {
      updateData.tags = afterData.tags;
    }

    const beforeFront = beforeData?.frontLanguage ?? null;
    const afterFront = afterData.frontLanguage ?? null;
    if (beforeFront !== afterFront) updateData.frontLanguage = afterFront;

    const beforeBack = beforeData?.backLanguage ?? null;
    const afterBack = afterData.backLanguage ?? null;
    if (beforeBack !== afterBack) updateData.backLanguage = afterBack;

    if (Object.keys(updateData).length === 0) return;

    await this.deckRepo.syncUserCopiesMetadata(deckId, updateData);
  }

  /**
   * Update source deck settings (owner or admin only).
   * Writes only fields that actually changed.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {Partial<Deck>} deckUpdate - Fields to update
   * @return {Promise<void>}
   */
  async updateDeckSettings(
    userId: string,
    deckId: string,
    deckUpdate: Partial<Deck>
  ): Promise<void> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");

    await this.checkDeckPermission(userId, deck, "owner");

    const updateData: Record<string, unknown> = {};

    if (
      deckUpdate.title !== undefined &&
      deckUpdate.title !== deck.title
    ) {
      updateData.title = deckUpdate.title;
      updateData.title_lower = deckUpdate.title.toLowerCase();
    }
    if (
      deckUpdate.category !== undefined &&
      deckUpdate.category !== deck.category
    ) {
      updateData.category = deckUpdate.category;
    }
    if (
      deckUpdate.icon !== undefined &&
      deckUpdate.icon !== deck.icon
    ) {
      updateData.icon = deckUpdate.icon;
    }
    if (
      deckUpdate.tags !== undefined &&
      JSON.stringify(deckUpdate.tags || []) !==
        JSON.stringify(deck.tags || [])
    ) {
      updateData.tags = deckUpdate.tags;
    }
    if (
      deckUpdate.isPublic !== undefined &&
      deckUpdate.isPublic !== deck.isPublic
    ) {
      updateData.isPublic = deckUpdate.isPublic;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await this.deckRepo.updateDeck(deckId, updateData);
    }
  }

  /**
   * Diff source deck cards against the user's local copy.
   * Returns the list of changes without modifying any data.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<Array<*>>} List of card changes
   */
  async checkCardChanges(
    userId: string,
    deckId: string
  ): Promise<
    Array<{
      cardId: string;
      type: "modified" | "deleted" | "new";
      changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
    }>
  > {
    const [srcDeck, userDeck] = await Promise.all([
      this.deckRepo.getSourceDeck(deckId),
      this.deckRepo.getUserDeck(userId, deckId),
    ]);
    if (!srcDeck) throw new Error("not-found");
    if (!userDeck) throw new Error("not-found");

    const [srcCards, userCards] = await Promise.all([
      this.cardRepo.getAllSourceCards(deckId),
      this.cardRepo.getAllUserCards(userId, deckId),
    ]);

    const srcMap = new Map(srcCards.map((c) => [c.id, c]));
    const userMap = new Map(userCards.map((c) => [c.id, c]));

    const result: Array<{
      cardId: string;
      type: "modified" | "deleted" | "new";
      changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
    }> = [];

    for (const [cardId, userCard] of userMap) {
      const src = srcMap.get(cardId);
      if (!src) {
        result.push({ cardId, type: "deleted" });
        continue;
      }
      const cardChanges: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];
      if (userCard.cardData.front !== src.cardData.front) {
        cardChanges.push({
          field: "front",
          oldValue: userCard.cardData.front,
          newValue: src.cardData.front,
        });
      }
      if (userCard.cardData.back !== src.cardData.back) {
        cardChanges.push({
          field: "back",
          oldValue: userCard.cardData.back,
          newValue: src.cardData.back,
        });
      }
      const userTags = [...(userCard.tags || [])].sort();
      const srcTags = [...(src.tags || [])].sort();
      if (JSON.stringify(userTags) !== JSON.stringify(srcTags)) {
        cardChanges.push({
          field: "tags",
          oldValue: userCard.tags,
          newValue: src.tags,
        });
      }
      if (cardChanges.length > 0) {
        result.push({ cardId, type: "modified", changes: cardChanges });
      }
    }

    for (const [cardId] of srcMap) {
      if (!userMap.has(cardId)) {
        result.push({ cardId, type: "new" });
      }
    }

    return result;
  }

  /**
   * Sync source deck cards into a user's learning copy.
   * syncAll = true: add new, update existing, delete removed.
   * syncAll = false: update only the specified cardIds.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {object} opts - Sync options
   * @return {Promise<object>} Number of synced cards
   */
  async syncCards(
    userId: string,
    deckId: string,
    opts: { syncAll: boolean; cardIds: string[] }
  ): Promise<{ syncedCount: number }> {
    const [srcDeck, srcCards, userCards] = await Promise.all([
      this.deckRepo.getSourceDeck(deckId),
      this.cardRepo.getAllSourceCards(deckId),
      this.cardRepo.getAllUserCards(userId, deckId),
    ]);

    if (!srcDeck) throw new Error("not-found");

    const srcMap = new Map(srcCards.map((c) => [c.id, c]));
    const userCardIds = new Set(userCards.map((c) => c.id));
    const { syncAll, cardIds } = opts;
    const now = new Date();

    const toSync = syncAll
      ? Array.from(userCardIds)
      : cardIds.filter((id) => userCardIds.has(id));

    const updateOps: Array<{
      id: string;
      cardData: { front: string; back: string };
      tags: string[];
    }> = [];
    const upsertOps: typeof srcCards = [];
    const deleteOps: string[] = [];

    for (const cardId of toSync) {
      const src = srcMap.get(cardId);
      if (!src) continue;
      const sanitized = CardCoreUpdateSchema.parse({
        cardData: {
          front: src.cardData.front || "",
          back: src.cardData.back || "",
        },
        tags: Array.isArray(src.tags) ? src.tags : [],
      });
      updateOps.push({
        id: cardId,
        cardData: sanitized.cardData ?? { front: src.cardData.front || "", back: src.cardData.back || "" },
        tags: sanitized.tags ?? [],
      });
    }

    if (syncAll) {
      for (const [cardId, src] of srcMap) {
        if (userCardIds.has(cardId)) continue;
        const sanitized = CardCoreUpdateSchema.parse({
          cardData: {
            front: src.cardData.front || "",
            back: src.cardData.back || "",
          },
          tags: Array.isArray(src.tags) ? src.tags : [],
        });
        const newCard = CardSchema.parse({
          ...src,
          id: cardId,
          cardData: sanitized.cardData ?? { front: src.cardData.front || "", back: src.cardData.back || "" },
          tags: sanitized.tags,
          createdAt: src.createdAt || now,
          firstLearn: { isNew: true, due: now, consecutiveGood: 0 },
          grade: CardGrade.NotGraded,
        });
        upsertOps.push(newCard);
      }
      for (const uid of userCardIds) {
        if (!srcMap.has(uid)) deleteOps.push(uid);
      }
    }

    const deckUpdate = {
      cardsNum: srcMap.size,
      updatedAt: srcDeck.updatedAt || now,
    };

    await this.cardRepo.bulkSyncUserCards(
      userId,
      deckId,
      { upsert: upsertOps, update: updateOps, delete: deleteOps },
      deckUpdate
    );

    return { syncedCount: updateOps.length + upsertOps.length };
  }

  /**
   * Update a source deck's metadata and apply card changes.
   * Owner/editor/admin only; editors cannot change deck metadata.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {object} deckData - Updated deck metadata
   * @param {object} changes - Card create/update/delete operations
   * @return {Promise<object>} Operation counts
   */
  async updateDeck(
    userId: string,
    deckId: string,
    deckData: {
      title: string;
      category?: string | null;
      icon: string;
      isPublic: boolean;
      tags?: string[];
      frontLanguage?: string | null;
      backLanguage?: string | null;
    },
    changes: {
      created: Array<{ cardData: { front: string; back: string }; tags?: string[] }>;
      updated: Array<{ id: string; cardData: { front: string; back: string }; tags?: string[] }>;
      deleted: string[];
    }
  ): Promise<{ updatedCount: number; createdCount: number; deletedCount: number }> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");

    const isOwner = deck.createdBy === userId;
    const isEditor = (deck.editors || []).includes(userId);
    const isAdminUser =
      !isOwner && !isEditor ? await this.userRepo.isAdmin(userId) : false;

    if (!isOwner && !isEditor && !isAdminUser) {
      throw new Error(
        "permission-denied: You don't have permission to edit this deck"
      );
    }

    const hasDeckDataChanges =
      deckData.title !== deck.title ||
      (deckData.category ?? null) !== (deck.category ?? null) ||
      deckData.icon !== deck.icon ||
      deckData.isPublic !== deck.isPublic ||
      JSON.stringify(deckData.tags || []) !==
        JSON.stringify(deck.tags || []) ||
      (deckData.frontLanguage ?? null) !== (deck.frontLanguage ?? null) ||
      (deckData.backLanguage ?? null) !== (deck.backLanguage ?? null);

    if (isEditor && !isOwner && !isAdminUser && hasDeckDataChanges) {
      throw new Error(
        "permission-denied: Editors can only modify cards, not deck metadata"
      );
    }

    const finalCardCount =
      (deck.cardsNum || 0) + changes.created.length - changes.deleted.length;

    const deckUpdate: Record<string, unknown> = {
      title: deckData.title,
      title_lower: deckData.title.toLowerCase(),
      category: deckData.category ?? null,
      icon: deckData.icon,
      isPublic: deckData.isPublic,
      tags: deckData.tags || [],
      updatedAt: new Date(),
      cardsNum: finalCardCount,
    };
    if ("frontLanguage" in deckData) {
      deckUpdate.frontLanguage = deckData.frontLanguage ?? null;
    }
    if ("backLanguage" in deckData) {
      deckUpdate.backLanguage = deckData.backLanguage ?? null;
    }

    await this.deckRepo.updateDeck(deckId, deckUpdate);
    await this.cardRepo.applySourceCardChanges(deckId, changes);

    return {
      updatedCount: changes.updated.length,
      createdCount: changes.created.length,
      deletedCount: changes.deleted.length,
    };
  }

  /**
   * Update the content (cardData + tags) of a single source deck card.
   * Owner/editor/admin only. Also updates the user's own learning copy if it exists.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {string} cardId - Card ID
   * @param {object} data - Updated card data
   * @return {Promise<void>}
   */
  async updateCardContent(
    userId: string,
    deckId: string,
    cardId: string,
    data: { cardData: { front: string; back: string }; tags?: string[] }
  ): Promise<void> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");

    const isOwner = deck.createdBy === userId;
    const isEditor = (deck.editors || []).includes(userId);
    if (!isOwner && !isEditor) {
      if (!(await this.userRepo.isAdmin(userId))) {
        throw new Error(
          "permission-denied: You don't have permission to edit this card"
        );
      }
    }

    const cardData = {
      cardData: {
        front: data.cardData.front || "",
        back: data.cardData.back || "",
      },
      tags: data.tags || [],
    };

    await this.cardRepo.updateSourceCard(deckId, cardId, cardData);
    await this.cardRepo.updateUserCardIfExists(userId, deckId, cardId, cardData);
  }

  /**
   * Toggle like on a deck.
   * Sends a one-time notification to the deck creator when liked for the first time.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<object>} Updated like state
   */
  async toggleLike(
    userId: string,
    deckId: string
  ): Promise<{ liked: boolean; newLikeCount: number }> {
    const { liked, newLikeCount, deckCreatorId, deckTitle } =
      await this.deckRepo.toggleLike(userId, deckId);

    if (liked && deckCreatorId && deckCreatorId !== userId && deckTitle) {
      try {
        const alreadyNotified = await this.deckRepo.hasBeenNotifiedLiker(
          deckId,
          userId
        );
        if (!alreadyNotified) {
          const user = await this.userRepo.getUser(userId);
          const likerUsername = user?.username ?? "Someone";
          await this.userRepo.writeNotification(deckCreatorId, {
            title: "New like!",
            body: `${likerUsername} liked your deck "${deckTitle}"`,
            type: "success",
            linkTo: `/deck/${deckId}`,
            read: false,
            createdAt: new Date(),
          });
          await this.deckRepo.markLikerNotified(deckId, userId);
        }
      } catch {
        // Don't fail the like operation if notification fails
      }
    }

    return { liked, newLikeCount };
  }

  /**
   * Add a single card to either the source deck (if owner/editor) or the user's learning copy.
   * Returns the generated card ID.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @param {object} cardData - Card content
   * @return {Promise<string>} ID of the created card
   */
  async addCard(
    userId: string,
    deckId: string,
    cardData: { front: string; back: string }
  ): Promise<string> {
    const [srcDeck, userDeck] = await Promise.all([
      this.deckRepo.getSourceDeck(deckId),
      this.deckRepo.getUserDeck(userId, deckId),
    ]);

    if (srcDeck) {
      const isOwner = srcDeck.createdBy === userId;
      const isEditor = (srcDeck.editors || []).includes(userId);
      if (isOwner || isEditor || (await this.userRepo.isAdmin(userId))) {
        return this.deckRepo.addSourceCard(deckId, cardData);
      }
      if (userDeck) {
        return this.deckRepo.addUserCard(userId, deckId, cardData);
      }
      throw new Error(
        "permission-denied: You don't have permission to add cards to this deck"
      );
    }

    if (userDeck) {
      return this.deckRepo.addUserCard(userId, deckId, cardData);
    }

    throw new Error("not-found");
  }

  /**
   * Soft-delete a source deck and notify all users who are learning it.
   * @param {string} userId - User ID (must be owner)
   * @param {string} deckId - Deck ID to delete
   * @return {Promise<object>} Number of notified users
   */
  async deleteDeck(
    userId: string,
    deckId: string
  ): Promise<{ notifiedUsers: number }> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");

    await this.checkDeckPermission(userId, deck, "owner");

    if (deck.is_deleted) return { notifiedUsers: 0 };

    await this.deckRepo.softDeleteDeck(deckId);

    const learnerIds = await this.deckRepo.getLearnerIds(deckId);

    await Promise.all(
      learnerIds.map((targetUserId) =>
        this.userRepo.writeNotification(targetUserId, {
          title: "Deck usunięty",
          body: `Deck "${deck.title}" został usunięty przez autora. Możesz kontynuować naukę w swojej bibliotece.`,
          type: "warning",
          linkTo: `/deck/${deckId}`,
          read: false,
          createdAt: new Date(),
        })
      )
    );

    return { notifiedUsers: learnerIds.length };
  }

  /**
   * Record a unique view for userId on the deck.
   * @param {string} userId - User ID
   * @param {string} deckId - Deck ID
   * @return {Promise<void>}
   */
  async recordView(userId: string, deckId: string): Promise<void> {
    await this.deckRepo.recordView(deckId, userId);
  }

  /**
   * Add an editor to a deck (owner-only; verifies that the target user exists).
   * @param {string} callerId - Caller user ID (must be owner)
   * @param {string} deckId - Deck ID
   * @param {string} editorId - User ID to add as editor
   * @return {Promise<void>}
   */
  async addDeckEditor(
    callerId: string,
    deckId: string,
    editorId: string
  ): Promise<void> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");
    if (deck.createdBy !== callerId) {
      throw new Error(
        "permission-denied: Only the deck owner can manage editors"
      );
    }
    const editorUser = await this.userRepo.getUser(editorId);
    if (!editorUser) throw new Error("not-found");
    await this.deckRepo.addEditor(deckId, editorId);
  }

  /**
   * Remove an editor from a deck (owner-only).
   * @param {string} callerId - Caller user ID (must be owner)
   * @param {string} deckId - Deck ID
   * @param {string} editorId - User ID to remove as editor
   * @return {Promise<void>}
   */
  async removeDeckEditor(
    callerId: string,
    deckId: string,
    editorId: string
  ): Promise<void> {
    const deck = await this.deckRepo.getSourceDeck(deckId);
    if (!deck) throw new Error("not-found");
    if (deck.createdBy !== callerId) {
      throw new Error(
        "permission-denied: Only the deck owner can manage editors"
      );
    }
    await this.deckRepo.removeEditor(deckId, editorId);
  }
}
