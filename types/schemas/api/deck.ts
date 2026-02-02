import { z } from "zod";
import {
  CardSchema,
  DeckSchema,
  DeckLearningDataSchema,
  CardCoreSchema,
  DeckCoreSchema,
  CardChangeWithTypeSchema,
  DeckSettingsUpdateSchema,
  DailyStatsSchema,
  UserDailyStatsSchema,
} from "../index";

// ===========================
// Deck request schemas
// ===========================

export const CreateDeckWithCardsRequestSchema = z
  .object({
    deckData: DeckCoreSchema,
    cards: z.array(CardCoreSchema),
  })
  .strict();
export type CreateDeckWithCardsRequest = z.infer<
  typeof CreateDeckWithCardsRequestSchema
>;

export const GetDeckDetailsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetDeckDetailsRequest = z.infer<typeof GetDeckDetailsRequestSchema>;

export const GetDeckCardsRequestSchema = z
  .object({
    deckId: z.string(),
    limit: z.number().int().min(1).max(1000).optional(),
    startAfter: z.string().optional().nullable(),
  })
  .strict();
export type GetDeckCardsRequest = z.infer<typeof GetDeckCardsRequestSchema>;

export const GetPopularDecksRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();
export type GetPopularDecksRequest = z.infer<
  typeof GetPopularDecksRequestSchema
>;

export const GetUserDeckDetailsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetUserDeckDetailsRequest = z.infer<
  typeof GetUserDeckDetailsRequestSchema
>;

export const GetUserDeckCardsRequestSchema = GetDeckCardsRequestSchema;
export type GetUserDeckCardsRequest = z.infer<
  typeof GetUserDeckCardsRequestSchema
>;

export const GetUserDueDeckCardsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetUserDueDeckCardsRequest = z.infer<
  typeof GetUserDueDeckCardsRequestSchema
>;

export const GetUserNewDeckCardsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetUserNewDeckCardsRequest = z.infer<
  typeof GetUserNewDeckCardsRequestSchema
>;

export const ResetDeckRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type ResetDeckRequest = z.infer<typeof ResetDeckRequestSchema>;

export const UpdateDeckSettingsRequestSchema = z
  .object({
    deckId: z.string(),
    deck: DeckSchema.partial(),
  })
  .strict();
export type UpdateDeckSettingsRequest = z.infer<
  typeof UpdateDeckSettingsRequestSchema
>;

export const UpdateUserDeckSettingsRequestSchema = z
  .object({
    deckId: z.string(),
    settings: DeckSettingsUpdateSchema,
  })
  .strict();
export type UpdateUserDeckSettingsRequest = z.infer<
  typeof UpdateUserDeckSettingsRequestSchema
>;

export const StartLearningDeckRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type StartLearningDeckRequest = z.infer<
  typeof StartLearningDeckRequestSchema
>;

export const DeleteDeckRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type DeleteDeckRequest = z.infer<typeof DeleteDeckRequestSchema>;

export const CheckCardChangesRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type CheckCardChangesRequest = z.infer<
  typeof CheckCardChangesRequestSchema
>;

export const SyncDeckCardsRequestSchema = z
  .object({
    deckId: z.string(),
    syncAll: z.boolean().optional(),
    cardIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.syncAll && (!data.cardIds || data.cardIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Either syncAll must be true or cardIds must be a non-empty array",
        path: ["cardIds"],
      });
    }
  });
export type SyncDeckCardsRequest = z.infer<typeof SyncDeckCardsRequestSchema>;

export const UpdateCardContentRequestSchema = z
  .object({
    deckId: z.string(),
    cardId: z.string(),
    cardData: CardCoreSchema,
  })
  .strict();
export type UpdateCardContentRequest = z.infer<
  typeof UpdateCardContentRequestSchema
>;

export const UpdateDeckRequestSchema = z
  .object({
    deckId: z.string(),
    deckData: DeckCoreSchema,
    changes: z
      .object({
        created: z.array(CardCoreSchema),
        updated: z.array(CardCoreSchema.extend({ id: z.string() })),
        deleted: z.array(z.string()),
      })
      .strict(),
  })
  .strict();
export type UpdateDeckRequest = z.infer<typeof UpdateDeckRequestSchema>;

export const StartLearningSessionRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type StartLearningSessionRequest = z.infer<
  typeof StartLearningSessionRequestSchema
>;

export const GetDeckDailyStatsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetDeckDailyStatsRequest = z.infer<
  typeof GetDeckDailyStatsRequestSchema
>;

export const GetDailyUserStatsRequestSchema = z.object({}).strict();

export type GetDailyUserStatsRequest = z.infer<
  typeof GetDailyUserStatsRequestSchema
>;
// ===========================
// Deck response schemas
// ===========================

export const GetDeckDetailsResponseSchema = z.object({
  deck: DeckSchema.nullable(),
  username: z.string(),
  isEditor: z.boolean().optional(),
});
export type GetDeckDetailsResponse = z.infer<
  typeof GetDeckDetailsResponseSchema
>;

export const GetDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
  hasMore: z.boolean(),
  lastDocId: z.string().nullable(),
});
export type GetDeckCardsResponse = z.infer<typeof GetDeckCardsResponseSchema>;

export const GetUserDecksResponseSchema = z.object({
  decks: z.array(DeckLearningDataSchema),
});
export type GetUserDecksResponse = z.infer<typeof GetUserDecksResponseSchema>;

export const CreateDeckWithCardsResponseSchema = z.object({
  deckId: z.string(),
});
export type CreateDeckWithCardsResponse = z.infer<
  typeof CreateDeckWithCardsResponseSchema
>;

export const GetPopularDecksResponseSchema = z.object({
  decks: z.array(DeckSchema),
});
export type GetPopularDecksResponse = z.infer<
  typeof GetPopularDecksResponseSchema
>;

export const StartLearningDeckResponseSchema = z.object({
  success: z.boolean(),
  deck: DeckLearningDataSchema,
});
export type StartLearningDeckResponse = z.infer<
  typeof StartLearningDeckResponseSchema
>;

export const DeleteDeckResponseSchema = z.object({
  success: z.boolean(),
  notifiedUsers: z.number(),
});
export type DeleteDeckResponse = z.infer<typeof DeleteDeckResponseSchema>;

export const GetUserDeckDetailsResponseSchema = z.object({
  deck: DeckLearningDataSchema.nullable(),
  createdDeck: z.boolean(),
});
export type GetUserDeckDetailsResponse = z.infer<
  typeof GetUserDeckDetailsResponseSchema
>;

export const GetUserDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
  hasMore: z.boolean(),
  lastDocId: z.string().nullable(),
});
export type GetUserDeckCardsResponse = z.infer<
  typeof GetUserDeckCardsResponseSchema
>;

export const GetUserDueDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
});
export type GetUserDueDeckCardsResponse = z.infer<
  typeof GetUserDueDeckCardsResponseSchema
>;

export const GetUserNewDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
});
export type GetUserNewDeckCardsResponse = z.infer<
  typeof GetUserNewDeckCardsResponseSchema
>;

export const CheckCardChangesResponseSchema = z.object({
  changes: z.array(CardChangeWithTypeSchema),
});
export type CheckCardChangesResponse = z.infer<
  typeof CheckCardChangesResponseSchema
>;

export const SyncDeckCardsResponseSchema = z.object({
  success: z.boolean(),
  syncedCount: z.number(),
});
export type SyncDeckCardsResponse = z.infer<typeof SyncDeckCardsResponseSchema>;

export const UpdateCardContentResponseSchema = z.object({
  success: z.boolean(),
});
export type UpdateCardContentResponse = z.infer<
  typeof UpdateCardContentResponseSchema
>;

export const UpdateDeckResponseSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number(),
  createdCount: z.number(),
  deletedCount: z.number(),
});
export type UpdateDeckResponse = z.infer<typeof UpdateDeckResponseSchema>;

export const ImportAnkiDeckRequestSchema = z
  .object({
    storagePath: z.string().min(1), // Path to .apkg file in Firebase Storage
    title: z.string().optional(), // Optional title, defaults to "Imported from Anki"
  })
  .strict();
export type ImportAnkiDeckRequest = z.infer<typeof ImportAnkiDeckRequestSchema>;

export const ImportAnkiDeckResponseSchema = z.object({
  deckId: z.string(),
  count: z.number(),
});
export type ImportAnkiDeckResponse = z.infer<
  typeof ImportAnkiDeckResponseSchema
>;

export const StartLearningSessionResponseSchema = z.object({
  cards: z.array(CardSchema),
  dailyStats: DailyStatsSchema,
  deck: DeckLearningDataSchema,
});
export type StartLearningSessionResponse = z.infer<
  typeof StartLearningSessionResponseSchema
>;

export const GetDeckDailyStatsResponseSchema = z.object({
  dailyStats: DailyStatsSchema.nullable(),
});
export type GetDeckDailyStatsResponse = z.infer<
  typeof GetDeckDailyStatsResponseSchema
>;

export const GetDailyUserStatsResponseSchema = z.object({
  dailyStats: UserDailyStatsSchema.nullable(),
});
export type GetDailyUserStatsResponse = z.infer<
  typeof GetDailyUserStatsResponseSchema
>;

// ===========================
// Views and Likes schemas
// ===========================

export const RecordDeckViewRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type RecordDeckViewRequest = z.infer<typeof RecordDeckViewRequestSchema>;

export const RecordDeckViewResponseSchema = z.object({
  success: z.boolean(),
  isNewView: z.boolean(),
});
export type RecordDeckViewResponse = z.infer<
  typeof RecordDeckViewResponseSchema
>;

export const ToggleDeckLikeRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type ToggleDeckLikeRequest = z.infer<typeof ToggleDeckLikeRequestSchema>;

export const ToggleDeckLikeResponseSchema = z.object({
  success: z.boolean(),
  liked: z.boolean(),
  newLikeCount: z.number(),
});
export type ToggleDeckLikeResponse = z.infer<
  typeof ToggleDeckLikeResponseSchema
>;

export const CheckIfLikedRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type CheckIfLikedRequest = z.infer<typeof CheckIfLikedRequestSchema>;

export const CheckIfLikedResponseSchema = z.object({
  isLiked: z.boolean(),
});
export type CheckIfLikedResponse = z.infer<typeof CheckIfLikedResponseSchema>;

// ===========================
// Quick Add Card schemas
// ===========================

export const AddCardToDeckRequestSchema = z
  .object({
    deckId: z.string().min(1),
    cardData: z.object({
      front: z.string().min(1).max(3000),
      back: z.string().max(3000).default(""),
    }),
    source: z.enum(["widget", "ocr", "deeplink", "manual"]).optional(),
  })
  .strict();
export type AddCardToDeckRequest = z.infer<typeof AddCardToDeckRequestSchema>;

export const AddCardToDeckResponseSchema = z.object({
  success: z.boolean(),
  cardId: z.string(),
});
export type AddCardToDeckResponse = z.infer<typeof AddCardToDeckResponseSchema>;

// ===========================
// Search Users schemas
// ===========================

export const SearchUsersRequestSchema = z
  .object({
    query: z.string().min(1),
  })
  .strict();
export type SearchUsersRequest = z.infer<typeof SearchUsersRequestSchema>;

export const SearchUsersResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      username: z.string(),
    })
  ),
});
export type SearchUsersResponse = z.infer<typeof SearchUsersResponseSchema>;

// ===========================
// Deck Editor Management schemas
// ===========================

export const AddDeckEditorRequestSchema = z
  .object({
    deckId: z.string(),
    userId: z.string(),
  })
  .strict();
export type AddDeckEditorRequest = z.infer<typeof AddDeckEditorRequestSchema>;

export const AddDeckEditorResponseSchema = z.object({
  success: z.boolean(),
});
export type AddDeckEditorResponse = z.infer<typeof AddDeckEditorResponseSchema>;

export const RemoveDeckEditorRequestSchema = z
  .object({
    deckId: z.string(),
    userId: z.string(),
  })
  .strict();
export type RemoveDeckEditorRequest = z.infer<
  typeof RemoveDeckEditorRequestSchema
>;

export const RemoveDeckEditorResponseSchema = z.object({
  success: z.boolean(),
});
export type RemoveDeckEditorResponse = z.infer<
  typeof RemoveDeckEditorResponseSchema
>;

export const GetDeckEditorsRequestSchema = z
  .object({
    deckId: z.string(),
  })
  .strict();
export type GetDeckEditorsRequest = z.infer<typeof GetDeckEditorsRequestSchema>;

export const GetDeckEditorsResponseSchema = z.object({
  editors: z.array(
    z.object({
      id: z.string(),
      username: z.string(),
    })
  ),
});
export type GetDeckEditorsResponse = z.infer<
  typeof GetDeckEditorsResponseSchema
>;
