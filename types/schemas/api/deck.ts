import { z } from "zod";
import {
  CardSchema,
  DeckSchema,
  DeckLearningDataSchema,
  CardCoreSchema,
  DeckCoreSchema,
  CardChangeWithTypeSchema,
  DeckSettingsUpdateSchema,
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
    limit: z
      .union([z.number().int().min(1).max(1000), z.literal(-1)])
      .optional(),
  })
  .strict();
export type GetUserDueDeckCardsRequest = z.infer<
  typeof GetUserDueDeckCardsRequestSchema
>;

export const GetUserNewDeckCardsRequestSchema = z
  .object({
    deckId: z.string(),
    limit: z.number().int().min(1).max(1000).optional(),
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

// ===========================
// Deck response schemas
// ===========================

export const GetDeckDetailsResponseSchema = z.object({
  deck: DeckSchema.nullable(),
  username: z.string(),
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

export const GetDueDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
});
export type GetDueDeckCardsResponse = z.infer<
  typeof GetDueDeckCardsResponseSchema
>;

export const GetNewDeckCardsResponseSchema = z.object({
  cards: z.array(CardSchema),
});
export type GetNewDeckCardsResponse = z.infer<
  typeof GetNewDeckCardsResponseSchema
>;

export const GetUserDecksResponseSchema = z.object({
  decks: z.array(DeckSchema),
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
