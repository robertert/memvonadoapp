"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckDuplicateCardFrontRequestSchema = exports.AddCardToDeckResponseSchema = exports.AddCardToDeckRequestSchema = exports.CheckIfLikedResponseSchema = exports.CheckIfLikedRequestSchema = exports.ToggleDeckLikeResponseSchema = exports.ToggleDeckLikeRequestSchema = exports.RecordDeckViewResponseSchema = exports.RecordDeckViewRequestSchema = exports.GetDailyUserStatsResponseSchema = exports.GetDeckDailyStatsResponseSchema = exports.StartLearningSessionResponseSchema = exports.SessionItemSchema = exports.ImportAnkiDeckResponseSchema = exports.ImportAnkiDeckRequestSchema = exports.UpdateDeckResponseSchema = exports.UpdateCardContentResponseSchema = exports.SyncDeckCardsResponseSchema = exports.CheckCardChangesResponseSchema = exports.GetUserNewDeckCardsResponseSchema = exports.GetUserDueDeckCardsResponseSchema = exports.GetUserDeckCardsResponseSchema = exports.GetUserDeckDetailsResponseSchema = exports.DeleteDeckResponseSchema = exports.StartLearningDeckResponseSchema = exports.GetPopularDecksResponseSchema = exports.CreateDeckWithCardsResponseSchema = exports.GetUserDecksResponseSchema = exports.GetDeckCardsResponseSchema = exports.GetDeckDetailsResponseSchema = exports.GetDailyUserStatsRequestSchema = exports.GetDeckDailyStatsRequestSchema = exports.StartLearningSessionRequestSchema = exports.UpdateDeckRequestSchema = exports.UpdateCardContentRequestSchema = exports.SyncDeckCardsRequestSchema = exports.CheckCardChangesRequestSchema = exports.DeleteDeckRequestSchema = exports.StartLearningDeckRequestSchema = exports.UpdateUserDeckSettingsRequestSchema = exports.UpdateDeckSettingsRequestSchema = exports.ResetDeckRequestSchema = exports.GetUserNewDeckCardsRequestSchema = exports.GetUserDueDeckCardsRequestSchema = exports.GetUserDeckCardsRequestSchema = exports.GetUserDeckDetailsRequestSchema = exports.GetPopularDecksRequestSchema = exports.GetDeckCardsRequestSchema = exports.GetDeckDetailsRequestSchema = exports.CreateDeckWithCardsRequestSchema = void 0;
exports.GetCardsByIdsResponseSchema = exports.GetCardsByIdsRequestSchema = exports.StartAIOSessionResponseSchema = exports.StartAIOSessionRequestSchema = exports.GetSourceDeckCardResponseSchema = exports.GetSourceDeckCardRequestSchema = exports.GetDeckEditorsResponseSchema = exports.GetDeckEditorsRequestSchema = exports.RemoveDeckEditorResponseSchema = exports.RemoveDeckEditorRequestSchema = exports.AddDeckEditorResponseSchema = exports.AddDeckEditorRequestSchema = exports.SearchUsersResponseSchema = exports.SearchUsersRequestSchema = exports.CheckDuplicateCardFrontResponseSchema = void 0;
const zod_1 = require("zod");
const index_1 = require("../index");
// ===========================
// Deck request schemas
// ===========================
exports.CreateDeckWithCardsRequestSchema = zod_1.z
    .object({
    deckData: index_1.DeckCoreSchema,
    cards: zod_1.z.array(index_1.CardCoreSchema),
})
    .strict();
exports.GetDeckDetailsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetDeckCardsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    limit: zod_1.z.number().int().min(1).max(1000).optional(),
    startAfter: zod_1.z.string().optional().nullable(),
})
    .strict();
exports.GetPopularDecksRequestSchema = zod_1.z
    .object({
    limit: zod_1.z.number().int().min(1).max(100).optional(),
})
    .strict();
exports.GetUserDeckDetailsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetUserDeckCardsRequestSchema = exports.GetDeckCardsRequestSchema;
exports.GetUserDueDeckCardsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetUserNewDeckCardsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.ResetDeckRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.UpdateDeckSettingsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    deck: index_1.DeckSchema.partial(),
})
    .strict();
exports.UpdateUserDeckSettingsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    settings: index_1.DeckSettingsUpdateSchema,
})
    .strict();
exports.StartLearningDeckRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.DeleteDeckRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.CheckCardChangesRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.SyncDeckCardsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    syncAll: zod_1.z.boolean().optional(),
    cardIds: zod_1.z.array(zod_1.z.string()).optional(),
})
    .superRefine((data, ctx) => {
    if (!data.syncAll && (!data.cardIds || data.cardIds.length === 0)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Either syncAll must be true or cardIds must be a non-empty array",
            path: ["cardIds"],
        });
    }
});
exports.UpdateCardContentRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    cardId: zod_1.z.string(),
    cardData: index_1.CardCoreSchema,
})
    .strict();
exports.UpdateDeckRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    deckData: index_1.DeckCoreSchema,
    changes: zod_1.z
        .object({
        created: zod_1.z.array(index_1.CardCoreSchema),
        updated: zod_1.z.array(index_1.CardCoreSchema.extend({ id: zod_1.z.string() })),
        deleted: zod_1.z.array(zod_1.z.string()),
    })
        .strict(),
})
    .strict();
exports.StartLearningSessionRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetDeckDailyStatsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetDailyUserStatsRequestSchema = zod_1.z.object({}).strict();
// ===========================
// Deck response schemas
// ===========================
exports.GetDeckDetailsResponseSchema = zod_1.z.object({
    deck: index_1.DeckSchema.nullable(),
    username: zod_1.z.string(),
    isEditor: zod_1.z.boolean().optional(),
});
exports.GetDeckCardsResponseSchema = zod_1.z.object({
    cards: zod_1.z.array(index_1.CardSchema),
    hasMore: zod_1.z.boolean(),
    lastDocId: zod_1.z.string().nullable(),
});
exports.GetUserDecksResponseSchema = zod_1.z.object({
    decks: zod_1.z.array(index_1.DeckLearningDataSchema),
});
exports.CreateDeckWithCardsResponseSchema = zod_1.z.object({
    deckId: zod_1.z.string(),
});
exports.GetPopularDecksResponseSchema = zod_1.z.object({
    decks: zod_1.z.array(index_1.DeckSchema),
});
exports.StartLearningDeckResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    deck: index_1.DeckLearningDataSchema,
});
exports.DeleteDeckResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    notifiedUsers: zod_1.z.number(),
});
exports.GetUserDeckDetailsResponseSchema = zod_1.z.object({
    deck: index_1.DeckLearningDataSchema.nullable(),
    createdDeck: zod_1.z.boolean(),
});
exports.GetUserDeckCardsResponseSchema = zod_1.z.object({
    cards: zod_1.z.array(index_1.CardSchema),
    hasMore: zod_1.z.boolean(),
    lastDocId: zod_1.z.string().nullable(),
});
exports.GetUserDueDeckCardsResponseSchema = zod_1.z.object({
    cards: zod_1.z.array(index_1.CardSchema),
});
exports.GetUserNewDeckCardsResponseSchema = zod_1.z.object({
    cards: zod_1.z.array(index_1.CardSchema),
});
exports.CheckCardChangesResponseSchema = zod_1.z.object({
    changes: zod_1.z.array(index_1.CardChangeWithTypeSchema),
});
exports.SyncDeckCardsResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    syncedCount: zod_1.z.number(),
});
exports.UpdateCardContentResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.UpdateDeckResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    updatedCount: zod_1.z.number(),
    createdCount: zod_1.z.number(),
    deletedCount: zod_1.z.number(),
});
exports.ImportAnkiDeckRequestSchema = zod_1.z
    .object({
    storagePath: zod_1.z.string().min(1), // Path to .apkg file in Firebase Storage
    title: zod_1.z.string().optional(), // Optional title, defaults to "Imported from Anki"
})
    .strict();
exports.ImportAnkiDeckResponseSchema = zod_1.z.object({
    deckId: zod_1.z.string(),
    count: zod_1.z.number(),
});
exports.SessionItemSchema = zod_1.z.object({
    card: index_1.CardSchema,
    direction: zod_1.z.enum(["forward", "reverse"]),
});
exports.StartLearningSessionResponseSchema = zod_1.z.object({
    items: zod_1.z.array(exports.SessionItemSchema),
    dailyStats: index_1.DailyStatsSchema,
    deck: index_1.DeckLearningDataSchema,
});
exports.GetDeckDailyStatsResponseSchema = zod_1.z.object({
    dailyStats: index_1.DailyStatsSchema.nullable(),
});
exports.GetDailyUserStatsResponseSchema = zod_1.z.object({
    dailyStats: index_1.UserDailyStatsSchema.nullable(),
});
// ===========================
// Views and Likes schemas
// ===========================
exports.RecordDeckViewRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.RecordDeckViewResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    isNewView: zod_1.z.boolean(),
});
exports.ToggleDeckLikeRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.ToggleDeckLikeResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    liked: zod_1.z.boolean(),
    newLikeCount: zod_1.z.number(),
});
exports.CheckIfLikedRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.CheckIfLikedResponseSchema = zod_1.z.object({
    isLiked: zod_1.z.boolean(),
});
// ===========================
// Quick Add Card schemas
// ===========================
exports.AddCardToDeckRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string().min(1),
    cardData: zod_1.z.object({
        front: zod_1.z.string().min(1).max(3000),
        back: zod_1.z.string().max(3000).default(""),
    }),
    source: zod_1.z.enum(["widget", "ocr", "deeplink", "manual"]).optional(),
})
    .strict();
exports.AddCardToDeckResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    cardId: zod_1.z.string(),
});
// ===========================
// Duplicate check schemas
// ===========================
exports.CheckDuplicateCardFrontRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    front: zod_1.z.string(),
    excludeCardId: zod_1.z.string().optional().nullable(),
})
    .strict();
exports.CheckDuplicateCardFrontResponseSchema = zod_1.z.object({
    isDuplicate: zod_1.z.boolean(),
    conflictCardId: zod_1.z.string().nullable(),
});
// ===========================
// Search Users schemas
// ===========================
exports.SearchUsersRequestSchema = zod_1.z
    .object({
    query: zod_1.z.string().min(1),
})
    .strict();
exports.SearchUsersResponseSchema = zod_1.z.object({
    users: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        username: zod_1.z.string(),
    })),
});
// ===========================
// Deck Editor Management schemas
// ===========================
exports.AddDeckEditorRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    userId: zod_1.z.string(),
})
    .strict();
exports.AddDeckEditorResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.RemoveDeckEditorRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    userId: zod_1.z.string(),
})
    .strict();
exports.RemoveDeckEditorResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.GetDeckEditorsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.GetDeckEditorsResponseSchema = zod_1.z.object({
    editors: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        username: zod_1.z.string(),
    })),
});
exports.GetSourceDeckCardRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    cardId: zod_1.z.string(),
})
    .strict();
exports.GetSourceDeckCardResponseSchema = zod_1.z.object({
    card: index_1.CardSchema,
});
// ===========================
// AIO Session schemas
// ===========================
exports.StartAIOSessionRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
})
    .strict();
exports.StartAIOSessionResponseSchema = zod_1.z.object({
    shuffledCardIds: zod_1.z.array(zod_1.z.string()),
    cards: zod_1.z.array(index_1.CardSchema),
});
exports.GetCardsByIdsRequestSchema = zod_1.z
    .object({
    deckId: zod_1.z.string(),
    cardIds: zod_1.z.array(zod_1.z.string()).min(1).max(100),
})
    .strict();
exports.GetCardsByIdsResponseSchema = zod_1.z.object({
    cards: zod_1.z.array(index_1.CardSchema),
});
