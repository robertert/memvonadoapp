import { z } from "zod";
export declare const CreateDeckWithCardsRequestSchema: z.ZodObject<{
    deckData: z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPublic: z.ZodBoolean;
        frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    }, {
        title: string;
        isPublic: boolean;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    }>;
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
    }, {
        cardData: {
            front: string;
            back: string;
        };
        tags?: string[] | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    cards: {
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
    }[];
    deckData: {
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    };
}, {
    cards: {
        cardData: {
            front: string;
            back: string;
        };
        tags?: string[] | undefined;
    }[];
    deckData: {
        title: string;
        isPublic: boolean;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    };
}>;
export type CreateDeckWithCardsRequest = z.infer<typeof CreateDeckWithCardsRequestSchema>;
export declare const GetDeckDetailsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type GetDeckDetailsRequest = z.infer<typeof GetDeckDetailsRequestSchema>;
export declare const GetDeckCardsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
    startAfter: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    limit?: number | undefined;
    startAfter?: string | null | undefined;
}, {
    deckId: string;
    limit?: number | undefined;
    startAfter?: string | null | undefined;
}>;
export type GetDeckCardsRequest = z.infer<typeof GetDeckCardsRequestSchema>;
export declare const GetPopularDecksRequestSchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    limit?: number | undefined;
}, {
    limit?: number | undefined;
}>;
export type GetPopularDecksRequest = z.infer<typeof GetPopularDecksRequestSchema>;
export declare const GetUserDeckDetailsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type GetUserDeckDetailsRequest = z.infer<typeof GetUserDeckDetailsRequestSchema>;
export declare const GetUserDeckCardsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
    startAfter: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    limit?: number | undefined;
    startAfter?: string | null | undefined;
}, {
    deckId: string;
    limit?: number | undefined;
    startAfter?: string | null | undefined;
}>;
export type GetUserDeckCardsRequest = z.infer<typeof GetUserDeckCardsRequestSchema>;
export declare const GetUserDueDeckCardsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type GetUserDueDeckCardsRequest = z.infer<typeof GetUserDueDeckCardsRequestSchema>;
export declare const GetUserNewDeckCardsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type GetUserNewDeckCardsRequest = z.infer<typeof GetUserNewDeckCardsRequestSchema>;
export declare const ResetDeckRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type ResetDeckRequest = z.infer<typeof ResetDeckRequestSchema>;
export declare const UpdateDeckSettingsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    deck: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        icon: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        isPublic: z.ZodOptional<z.ZodBoolean>;
        frontLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        backLanguage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        id: z.ZodOptional<z.ZodString>;
        views: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        likes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        cardsNum: z.ZodOptional<z.ZodNumber>;
        createdBy: z.ZodOptional<z.ZodString>;
        is_deleted: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        deletedAt: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
        createdAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        id?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        isPublic?: boolean | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        cardsNum?: number | undefined;
        createdBy?: string | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: Date | undefined;
    }, {
        createdAt?: unknown;
        updatedAt?: unknown;
        id?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        isPublic?: boolean | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        cardsNum?: number | undefined;
        createdBy?: string | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    deck: {
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        id?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        isPublic?: boolean | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        cardsNum?: number | undefined;
        createdBy?: string | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: Date | undefined;
    };
}, {
    deckId: string;
    deck: {
        createdAt?: unknown;
        updatedAt?: unknown;
        id?: string | undefined;
        tags?: string[] | undefined;
        title?: string | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        isPublic?: boolean | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        cardsNum?: number | undefined;
        createdBy?: string | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    };
}>;
export type UpdateDeckSettingsRequest = z.infer<typeof UpdateDeckSettingsRequestSchema>;
export declare const UpdateUserDeckSettingsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    settings: z.ZodObject<{
        dueCardsNumPerDay: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        newCardsNumPerDay: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        zenMode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        shuffleNewCards: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strict", z.ZodTypeAny, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
    }, {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
    };
    deckId: string;
}, {
    settings: {
        dueCardsNumPerDay?: number | undefined;
        newCardsNumPerDay?: number | undefined;
        zenMode?: boolean | undefined;
        shuffleNewCards?: boolean | undefined;
    };
    deckId: string;
}>;
export type UpdateUserDeckSettingsRequest = z.infer<typeof UpdateUserDeckSettingsRequestSchema>;
export declare const StartLearningDeckRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type StartLearningDeckRequest = z.infer<typeof StartLearningDeckRequestSchema>;
export declare const DeleteDeckRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type DeleteDeckRequest = z.infer<typeof DeleteDeckRequestSchema>;
export declare const CheckCardChangesRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type CheckCardChangesRequest = z.infer<typeof CheckCardChangesRequestSchema>;
export declare const SyncDeckCardsRequestSchema: z.ZodEffects<z.ZodObject<{
    deckId: z.ZodString;
    syncAll: z.ZodOptional<z.ZodBoolean>;
    cardIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    deckId: string;
    syncAll?: boolean | undefined;
    cardIds?: string[] | undefined;
}, {
    deckId: string;
    syncAll?: boolean | undefined;
    cardIds?: string[] | undefined;
}>, {
    deckId: string;
    syncAll?: boolean | undefined;
    cardIds?: string[] | undefined;
}, {
    deckId: string;
    syncAll?: boolean | undefined;
    cardIds?: string[] | undefined;
}>;
export type SyncDeckCardsRequest = z.infer<typeof SyncDeckCardsRequestSchema>;
export declare const UpdateCardContentRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    cardId: z.ZodString;
    cardData: z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
    }, {
        cardData: {
            front: string;
            back: string;
        };
        tags?: string[] | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    cardData: {
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
    };
    deckId: string;
    cardId: string;
}, {
    cardData: {
        cardData: {
            front: string;
            back: string;
        };
        tags?: string[] | undefined;
    };
    deckId: string;
    cardId: string;
}>;
export type UpdateCardContentRequest = z.infer<typeof UpdateCardContentRequestSchema>;
export declare const UpdateDeckRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
    deckData: z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPublic: z.ZodBoolean;
        frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strict", z.ZodTypeAny, {
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    }, {
        title: string;
        isPublic: boolean;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    }>;
    changes: z.ZodObject<{
        created: z.ZodArray<z.ZodObject<{
            cardData: z.ZodObject<{
                front: z.ZodString;
                back: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                front: string;
                back: string;
            }, {
                front: string;
                back: string;
            }>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }, {
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }>, "many">;
        updated: z.ZodArray<z.ZodObject<{
            cardData: z.ZodObject<{
                front: z.ZodString;
                back: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                front: string;
                back: string;
            }, {
                front: string;
                back: string;
            }>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        } & {
            id: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }, {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }>, "many">;
        deleted: z.ZodArray<z.ZodString, "many">;
    }, "strict", z.ZodTypeAny, {
        deleted: string[];
        created: {
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }[];
        updated: {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }[];
    }, {
        deleted: string[];
        created: {
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }[];
        updated: {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }[];
    }>;
}, "strict", z.ZodTypeAny, {
    deckId: string;
    changes: {
        deleted: string[];
        created: {
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }[];
        updated: {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags: string[];
        }[];
    };
    deckData: {
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    };
}, {
    deckId: string;
    changes: {
        deleted: string[];
        created: {
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }[];
        updated: {
            id: string;
            cardData: {
                front: string;
                back: string;
            };
            tags?: string[] | undefined;
        }[];
    };
    deckData: {
        title: string;
        isPublic: boolean;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
    };
}>;
export type UpdateDeckRequest = z.infer<typeof UpdateDeckRequestSchema>;
export declare const StartLearningSessionRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type StartLearningSessionRequest = z.infer<typeof StartLearningSessionRequestSchema>;
export declare const GetDeckDailyStatsRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type GetDeckDailyStatsRequest = z.infer<typeof GetDeckDailyStatsRequestSchema>;
export declare const GetDailyUserStatsRequestSchema: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type GetDailyUserStatsRequest = z.infer<typeof GetDailyUserStatsRequestSchema>;
export declare const GetDeckDetailsResponseSchema: z.ZodObject<{
    deck: z.ZodNullable<z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPublic: z.ZodBoolean;
        frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        id: z.ZodString;
        views: z.ZodDefault<z.ZodNumber>;
        likes: z.ZodDefault<z.ZodNumber>;
        cardsNum: z.ZodNumber;
        createdBy: z.ZodString;
        is_deleted: z.ZodDefault<z.ZodBoolean>;
        deletedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    }, {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }>>;
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    deck: {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    } | null;
}, {
    username: string;
    deck: {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    } | null;
}>;
export type GetDeckDetailsResponse = z.infer<typeof GetDeckDetailsResponseSchema>;
export declare const GetDeckCardsResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>, "many">;
    hasMore: z.ZodBoolean;
    lastDocId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}, {
    cards: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}>;
export type GetDeckCardsResponse = z.infer<typeof GetDeckCardsResponseSchema>;
export declare const GetUserDecksResponseSchema: z.ZodObject<{
    decks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        cardsNum: z.ZodNumber;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
        isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    } & {
        title: z.ZodString;
        settings: z.ZodObject<{
            dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            zenMode: z.ZodDefault<z.ZodBoolean>;
            shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        }, {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        }>;
    } & {
        lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            newCardsRemaining: z.ZodNumber;
            dueCardsRemaining: z.ZodNumber;
            inProgressDueCards: z.ZodNumber;
            inProgressNewCards: z.ZodNumber;
            completedNewToday: z.ZodNumber;
            completedDueToday: z.ZodNumber;
            lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strict", z.ZodTypeAny, {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        }, {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    }, {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    decks: {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    }[];
}, {
    decks: {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    }[];
}>;
export type GetUserDecksResponse = z.infer<typeof GetUserDecksResponseSchema>;
export declare const CreateDeckWithCardsResponseSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type CreateDeckWithCardsResponse = z.infer<typeof CreateDeckWithCardsResponseSchema>;
export declare const GetPopularDecksResponseSchema: z.ZodObject<{
    decks: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodDefault<z.ZodString>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        isPublic: z.ZodBoolean;
        frontLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        backLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        id: z.ZodString;
        views: z.ZodDefault<z.ZodNumber>;
        likes: z.ZodDefault<z.ZodNumber>;
        cardsNum: z.ZodNumber;
        createdBy: z.ZodString;
        is_deleted: z.ZodDefault<z.ZodBoolean>;
        deletedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    }, {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    decks: {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        tags: string[];
        title: string;
        icon: string;
        isPublic: boolean;
        views: number;
        likes: number;
        cardsNum: number;
        createdBy: string;
        is_deleted: boolean;
        category?: string | null | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        deletedAt?: Date | undefined;
    }[];
}, {
    decks: {
        id: string;
        title: string;
        isPublic: boolean;
        cardsNum: number;
        createdBy: string;
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        category?: string | null | undefined;
        icon?: string | undefined;
        frontLanguage?: string | null | undefined;
        backLanguage?: string | null | undefined;
        views?: number | undefined;
        likes?: number | undefined;
        is_deleted?: boolean | undefined;
        deletedAt?: unknown;
    }[];
}>;
export type GetPopularDecksResponse = z.infer<typeof GetPopularDecksResponseSchema>;
export declare const StartLearningDeckResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    deck: z.ZodObject<{
        id: z.ZodString;
        cardsNum: z.ZodNumber;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
        isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    } & {
        title: z.ZodString;
        settings: z.ZodObject<{
            dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            zenMode: z.ZodDefault<z.ZodBoolean>;
            shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        }, {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        }>;
    } & {
        lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            newCardsRemaining: z.ZodNumber;
            dueCardsRemaining: z.ZodNumber;
            inProgressDueCards: z.ZodNumber;
            inProgressNewCards: z.ZodNumber;
            completedNewToday: z.ZodNumber;
            completedDueToday: z.ZodNumber;
            lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strict", z.ZodTypeAny, {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        }, {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    }, {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    deck: {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    };
}, {
    success: boolean;
    deck: {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    };
}>;
export type StartLearningDeckResponse = z.infer<typeof StartLearningDeckResponseSchema>;
export declare const DeleteDeckResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    notifiedUsers: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    notifiedUsers: number;
}, {
    success: boolean;
    notifiedUsers: number;
}>;
export type DeleteDeckResponse = z.infer<typeof DeleteDeckResponseSchema>;
export declare const GetUserDeckDetailsResponseSchema: z.ZodObject<{
    deck: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        cardsNum: z.ZodNumber;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
        isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    } & {
        title: z.ZodString;
        settings: z.ZodObject<{
            dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            zenMode: z.ZodDefault<z.ZodBoolean>;
            shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        }, {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        }>;
    } & {
        lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            newCardsRemaining: z.ZodNumber;
            dueCardsRemaining: z.ZodNumber;
            inProgressDueCards: z.ZodNumber;
            inProgressNewCards: z.ZodNumber;
            completedNewToday: z.ZodNumber;
            completedDueToday: z.ZodNumber;
            lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strict", z.ZodTypeAny, {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        }, {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    }, {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    }>>;
    createdDeck: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    deck: {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    } | null;
    createdDeck: boolean;
}, {
    deck: {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    } | null;
    createdDeck: boolean;
}>;
export type GetUserDeckDetailsResponse = z.infer<typeof GetUserDeckDetailsResponseSchema>;
export declare const GetUserDeckCardsResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>, "many">;
    hasMore: z.ZodBoolean;
    lastDocId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}, {
    cards: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    hasMore: boolean;
    lastDocId: string | null;
}>;
export type GetUserDeckCardsResponse = z.infer<typeof GetUserDeckCardsResponseSchema>;
export declare const GetUserDueDeckCardsResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}, {
    cards: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}>;
export type GetUserDueDeckCardsResponse = z.infer<typeof GetUserDueDeckCardsResponseSchema>;
export declare const GetUserNewDeckCardsResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}, {
    cards: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
}>;
export type GetUserNewDeckCardsResponse = z.infer<typeof GetUserNewDeckCardsResponseSchema>;
export declare const CheckCardChangesResponseSchema: z.ZodObject<{
    changes: z.ZodArray<z.ZodObject<{
        cardId: z.ZodString;
        type: z.ZodEnum<["modified", "deleted", "new"]>;
        changes: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            oldValue: z.ZodAny;
            newValue: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            field: string;
            oldValue?: any;
            newValue?: any;
        }, {
            field: string;
            oldValue?: any;
            newValue?: any;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        type: "modified" | "deleted" | "new";
        cardId: string;
        changes?: {
            field: string;
            oldValue?: any;
            newValue?: any;
        }[] | undefined;
    }, {
        type: "modified" | "deleted" | "new";
        cardId: string;
        changes?: {
            field: string;
            oldValue?: any;
            newValue?: any;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    changes: {
        type: "modified" | "deleted" | "new";
        cardId: string;
        changes?: {
            field: string;
            oldValue?: any;
            newValue?: any;
        }[] | undefined;
    }[];
}, {
    changes: {
        type: "modified" | "deleted" | "new";
        cardId: string;
        changes?: {
            field: string;
            oldValue?: any;
            newValue?: any;
        }[] | undefined;
    }[];
}>;
export type CheckCardChangesResponse = z.infer<typeof CheckCardChangesResponseSchema>;
export declare const SyncDeckCardsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    syncedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    syncedCount: number;
}, {
    success: boolean;
    syncedCount: number;
}>;
export type SyncDeckCardsResponse = z.infer<typeof SyncDeckCardsResponseSchema>;
export declare const UpdateCardContentResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
}, {
    success: boolean;
}>;
export type UpdateCardContentResponse = z.infer<typeof UpdateCardContentResponseSchema>;
export declare const UpdateDeckResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    updatedCount: z.ZodNumber;
    createdCount: z.ZodNumber;
    deletedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    updatedCount: number;
    createdCount: number;
    deletedCount: number;
}, {
    success: boolean;
    updatedCount: number;
    createdCount: number;
    deletedCount: number;
}>;
export type UpdateDeckResponse = z.infer<typeof UpdateDeckResponseSchema>;
export declare const ImportAnkiDeckRequestSchema: z.ZodObject<{
    storagePath: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    storagePath: string;
    title?: string | undefined;
}, {
    storagePath: string;
    title?: string | undefined;
}>;
export type ImportAnkiDeckRequest = z.infer<typeof ImportAnkiDeckRequestSchema>;
export declare const ImportAnkiDeckResponseSchema: z.ZodObject<{
    deckId: z.ZodString;
    count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deckId: string;
    count: number;
}, {
    deckId: string;
    count: number;
}>;
export type ImportAnkiDeckResponse = z.infer<typeof ImportAnkiDeckResponseSchema>;
export declare const StartLearningSessionResponseSchema: z.ZodObject<{
    cards: z.ZodArray<z.ZodObject<{
        cardData: z.ZodObject<{
            front: z.ZodString;
            back: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            front: string;
            back: string;
        }, {
            front: string;
            back: string;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    } & {
        cardAlgo: z.ZodOptional<z.ZodObject<{
            difficulty: z.ZodNumber;
            scheduled_days: z.ZodNumber;
            due: z.ZodEffects<z.ZodDate, Date, unknown>;
            last_review: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            reps: z.ZodNumber;
            state: z.ZodNumber;
            stability: z.ZodNumber;
            elapsed_days: z.ZodNumber;
            lapses: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        }, {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        }>>;
        firstLearn: z.ZodObject<{
            isNew: z.ZodDefault<z.ZodBoolean>;
            isFirst: z.ZodOptional<z.ZodBoolean>;
            due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
            consecutiveGood: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }, {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        }>;
        grade: z.ZodOptional<z.ZodNativeEnum<typeof import("../card").CardGrade>>;
    } & {
        createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        id: z.ZodString;
        hasChanges: z.ZodOptional<z.ZodBoolean>;
        updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    }, "strict", z.ZodTypeAny, {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }, {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }>, "many">;
    dailyStats: z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
    }, {
        completedNewToday: number;
        completedDueToday: number;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        lastUpdatedStats?: unknown;
    }>;
    deck: z.ZodObject<{
        id: z.ZodString;
        cardsNum: z.ZodNumber;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
        isPublic: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    } & {
        title: z.ZodString;
        settings: z.ZodObject<{
            dueCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            newCardsNumPerDay: z.ZodOptional<z.ZodNumber>;
            zenMode: z.ZodDefault<z.ZodBoolean>;
            shuffleNewCards: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        }, {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        }>;
    } & {
        lastReviewDate: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
        updatedAt: z.ZodEffects<z.ZodDate, Date, unknown>;
    } & {
        dailyStats: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            newCardsRemaining: z.ZodNumber;
            dueCardsRemaining: z.ZodNumber;
            inProgressDueCards: z.ZodNumber;
            inProgressNewCards: z.ZodNumber;
            completedNewToday: z.ZodNumber;
            completedDueToday: z.ZodNumber;
            lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
        }, "strict", z.ZodTypeAny, {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        }, {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    }, {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
    };
    cards: {
        createdAt: Date;
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        tags: string[];
        firstLearn: {
            isNew: boolean;
            due?: Date | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        updatedAt?: Date | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            due: Date;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            last_review?: Date | undefined;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    deck: {
        settings: {
            zenMode: boolean;
            shuffleNewCards: boolean;
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
        };
        updatedAt: Date;
        id: string;
        title: string;
        cardsNum: number;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            lastUpdatedStats: Date;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: Date | undefined;
    };
}, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        lastUpdatedStats?: unknown;
    };
    cards: {
        id: string;
        cardData: {
            front: string;
            back: string;
        };
        firstLearn: {
            due?: unknown;
            isNew?: boolean | undefined;
            isFirst?: boolean | undefined;
            consecutiveGood?: number | undefined;
        };
        createdAt?: unknown;
        updatedAt?: unknown;
        tags?: string[] | undefined;
        cardAlgo?: {
            difficulty: number;
            scheduled_days: number;
            reps: number;
            state: number;
            stability: number;
            elapsed_days: number;
            lapses: number;
            due?: unknown;
            last_review?: unknown;
        } | undefined;
        grade?: import("../card").CardGrade | undefined;
        hasChanges?: boolean | undefined;
    }[];
    deck: {
        settings: {
            dueCardsNumPerDay?: number | undefined;
            newCardsNumPerDay?: number | undefined;
            zenMode?: boolean | undefined;
            shuffleNewCards?: boolean | undefined;
        };
        id: string;
        title: string;
        cardsNum: number;
        updatedAt?: unknown;
        dailyStats?: {
            completedNewToday: number;
            completedDueToday: number;
            newCardsRemaining: number;
            dueCardsRemaining: number;
            inProgressDueCards: number;
            inProgressNewCards: number;
            lastUpdatedStats?: unknown;
        } | null | undefined;
        tags?: string[] | null | undefined;
        category?: string | null | undefined;
        icon?: string | null | undefined;
        isPublic?: boolean | null | undefined;
        lastReviewDate?: unknown;
    };
}>;
export type StartLearningSessionResponse = z.infer<typeof StartLearningSessionResponseSchema>;
export declare const GetDeckDailyStatsResponseSchema: z.ZodObject<{
    dailyStats: z.ZodNullable<z.ZodObject<{
        newCardsRemaining: z.ZodNumber;
        dueCardsRemaining: z.ZodNumber;
        inProgressDueCards: z.ZodNumber;
        inProgressNewCards: z.ZodNumber;
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strict", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
    }, {
        completedNewToday: number;
        completedDueToday: number;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        lastUpdatedStats?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
    } | null;
}, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        newCardsRemaining: number;
        dueCardsRemaining: number;
        inProgressDueCards: number;
        inProgressNewCards: number;
        lastUpdatedStats?: unknown;
    } | null;
}>;
export type GetDeckDailyStatsResponse = z.infer<typeof GetDeckDailyStatsResponseSchema>;
export declare const GetDailyUserStatsResponseSchema: z.ZodObject<{
    dailyStats: z.ZodNullable<z.ZodObject<{
        completedNewToday: z.ZodNumber;
        completedDueToday: z.ZodNumber;
        lastUpdatedStats: z.ZodEffects<z.ZodDate, Date, unknown>;
    }, "strip", z.ZodTypeAny, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    }, {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats: Date;
    } | null;
}, {
    dailyStats: {
        completedNewToday: number;
        completedDueToday: number;
        lastUpdatedStats?: unknown;
    } | null;
}>;
export type GetDailyUserStatsResponse = z.infer<typeof GetDailyUserStatsResponseSchema>;
export declare const RecordDeckViewRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type RecordDeckViewRequest = z.infer<typeof RecordDeckViewRequestSchema>;
export declare const RecordDeckViewResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    isNewView: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    isNewView: boolean;
}, {
    success: boolean;
    isNewView: boolean;
}>;
export type RecordDeckViewResponse = z.infer<typeof RecordDeckViewResponseSchema>;
export declare const ToggleDeckLikeRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type ToggleDeckLikeRequest = z.infer<typeof ToggleDeckLikeRequestSchema>;
export declare const ToggleDeckLikeResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    liked: z.ZodBoolean;
    newLikeCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    liked: boolean;
    newLikeCount: number;
}, {
    success: boolean;
    liked: boolean;
    newLikeCount: number;
}>;
export type ToggleDeckLikeResponse = z.infer<typeof ToggleDeckLikeResponseSchema>;
export declare const CheckIfLikedRequestSchema: z.ZodObject<{
    deckId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    deckId: string;
}, {
    deckId: string;
}>;
export type CheckIfLikedRequest = z.infer<typeof CheckIfLikedRequestSchema>;
export declare const CheckIfLikedResponseSchema: z.ZodObject<{
    isLiked: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    isLiked: boolean;
}, {
    isLiked: boolean;
}>;
export type CheckIfLikedResponse = z.infer<typeof CheckIfLikedResponseSchema>;
