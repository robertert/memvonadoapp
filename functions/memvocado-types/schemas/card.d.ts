import { z } from "zod";
/**
 * Reprezentacja numerycznych ocen przechowywanych w bazie.
 * Ułatwia czytanie kodu, jednocześnie zachowując kompatybilność z danymi.
 */
export declare enum CardGrade {
    /**
     * Karta nie została jeszcze oceniona.
     */
    NotGraded = -1,
    /**
     * Zła odpowiedź.
     */
    Wrong = 0,
    /**
     * Trudna odpowiedź.
     */
    Hard = 1,
    /**
     * Dobra odpowiedź.
     */
    Good = 2,
    /**
     * Łatwa odpowiedź.
     */
    Easy = 3
}
export declare const CardDataSchema: z.ZodEffects<z.ZodObject<{
    front: z.ZodString;
    back: z.ZodString;
    frontLower: z.ZodOptional<z.ZodString>;
    backLower: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    front: string;
    back: string;
    frontLower?: string | undefined;
    backLower?: string | undefined;
}, {
    front: string;
    back: string;
    frontLower?: string | undefined;
    backLower?: string | undefined;
}>, {
    front: string;
    back: string;
    frontLower: string;
    backLower: string;
}, {
    front: string;
    back: string;
    frontLower?: string | undefined;
    backLower?: string | undefined;
}>;
export type CardData = z.infer<typeof CardDataSchema>;
export declare const CardCoreSchema: z.ZodObject<{
    cardData: z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        frontLower: z.ZodOptional<z.ZodString>;
        backLower: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    tags: string[];
    cardData: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    };
}, {
    cardData: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    };
    tags?: string[] | undefined;
}>;
export type CardCore = z.infer<typeof CardCoreSchema>;
/**
 * Algorytm FSRS (Free Spaced Repetition Scheduler)
 */
export declare const CardAlgoSchema: z.ZodObject<{
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
}>;
export type CardAlgo = z.infer<typeof CardAlgoSchema>;
/**
 * First Learning - dane dla pierwszej nauki karty
 */
export declare const FirstLearnSchema: z.ZodObject<{
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
export type FirstLearn = z.infer<typeof FirstLearnSchema>;
/**
 * Timestampy karty
 */
export declare const CardTimestampSchema: z.ZodObject<{
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
}, "strict", z.ZodTypeAny, {
    createdAt: Date;
}, {
    createdAt?: unknown;
}>;
export type CardTimestamp = z.infer<typeof CardTimestampSchema>;
/**
 * Dane nauki/oceny karty
 */
export declare const CardLearningSchema: z.ZodObject<{
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
    grade: z.ZodOptional<z.ZodNativeEnum<typeof CardGrade>>;
    cardAlgoReverse: z.ZodOptional<z.ZodObject<{
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
    firstLearnReverse: z.ZodOptional<z.ZodObject<{
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
    }>>;
}, "strict", z.ZodTypeAny, {
    firstLearn: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    };
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
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}, {
    firstLearn: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    };
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
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}>;
export type CardLearning = z.infer<typeof CardLearningSchema>;
/**
 * Meta karty
 */
export declare const CardMetaSchema: z.ZodObject<{
    id: z.ZodString;
    hasChanges: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    randomSort: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    id: string;
    updatedAt?: Date | undefined;
    hasChanges?: boolean | undefined;
    randomSort?: number | undefined;
}, {
    id: string;
    updatedAt?: unknown;
    hasChanges?: boolean | undefined;
    randomSort?: number | undefined;
}>;
export type CardMeta = z.infer<typeof CardMetaSchema>;
/**
 * Pełna karta
 */
export declare const CardSchema: z.ZodObject<{
    cardData: z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        frontLower: z.ZodOptional<z.ZodString>;
        backLower: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
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
    grade: z.ZodOptional<z.ZodNativeEnum<typeof CardGrade>>;
    cardAlgoReverse: z.ZodOptional<z.ZodObject<{
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
    firstLearnReverse: z.ZodOptional<z.ZodObject<{
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
    }>>;
} & {
    createdAt: z.ZodEffects<z.ZodDate, Date, unknown>;
} & {
    id: z.ZodString;
    hasChanges: z.ZodOptional<z.ZodBoolean>;
    updatedAt: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    randomSort: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    id: string;
    tags: string[];
    createdAt: Date;
    cardData: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    };
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
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    hasChanges?: boolean | undefined;
    randomSort?: number | undefined;
}, {
    id: string;
    cardData: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    };
    firstLearn: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    };
    tags?: string[] | undefined;
    createdAt?: unknown;
    updatedAt?: unknown;
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
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    hasChanges?: boolean | undefined;
    randomSort?: number | undefined;
}>;
export type Card = z.infer<typeof CardSchema>;
/**
 * Częściowa aktualizacja danych karty (tylko cardData)
 */
export declare const CardDataUpdateSchema: z.ZodObject<{
    front: z.ZodOptional<z.ZodString>;
    back: z.ZodOptional<z.ZodString>;
    frontLower: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    backLower: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    front?: string | undefined;
    back?: string | undefined;
    frontLower?: string | undefined;
    backLower?: string | undefined;
}, {
    front?: string | undefined;
    back?: string | undefined;
    frontLower?: string | undefined;
    backLower?: string | undefined;
}>;
export type CardDataUpdate = z.infer<typeof CardDataUpdateSchema>;
/**
 * Częściowa aktualizacja core karty
 */
export declare const CardCoreUpdateSchema: z.ZodObject<{
    cardData: z.ZodOptional<z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        frontLower: z.ZodOptional<z.ZodString>;
        backLower: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
}, "strict", z.ZodTypeAny, {
    tags?: string[] | undefined;
    cardData?: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    } | undefined;
}, {
    tags?: string[] | undefined;
    cardData?: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    } | undefined;
}>;
export type CardCoreUpdate = z.infer<typeof CardCoreUpdateSchema>;
/**
 * Częściowa aktualizacja algorytmu karty
 */
export declare const CardAlgoUpdateSchema: z.ZodObject<{
    difficulty: z.ZodOptional<z.ZodNumber>;
    scheduled_days: z.ZodOptional<z.ZodNumber>;
    due: z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>;
    last_review: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
    reps: z.ZodOptional<z.ZodNumber>;
    state: z.ZodOptional<z.ZodNumber>;
    stability: z.ZodOptional<z.ZodNumber>;
    elapsed_days: z.ZodOptional<z.ZodNumber>;
    lapses: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    difficulty?: number | undefined;
    scheduled_days?: number | undefined;
    due?: Date | undefined;
    last_review?: Date | undefined;
    reps?: number | undefined;
    state?: number | undefined;
    stability?: number | undefined;
    elapsed_days?: number | undefined;
    lapses?: number | undefined;
}, {
    difficulty?: number | undefined;
    scheduled_days?: number | undefined;
    due?: unknown;
    last_review?: unknown;
    reps?: number | undefined;
    state?: number | undefined;
    stability?: number | undefined;
    elapsed_days?: number | undefined;
    lapses?: number | undefined;
}>;
export type CardAlgoUpdate = z.infer<typeof CardAlgoUpdateSchema>;
/**
 * Częściowa aktualizacja firstLearn
 */
export declare const FirstLearnUpdateSchema: z.ZodObject<{
    isNew: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    isFirst: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    due: z.ZodOptional<z.ZodOptional<z.ZodEffects<z.ZodDate, Date, unknown>>>;
    consecutiveGood: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "strict", z.ZodTypeAny, {
    due?: Date | undefined;
    isNew?: boolean | undefined;
    isFirst?: boolean | undefined;
    consecutiveGood?: number | undefined;
}, {
    due?: unknown;
    isNew?: boolean | undefined;
    isFirst?: boolean | undefined;
    consecutiveGood?: number | undefined;
}>;
export type FirstLearnUpdate = z.infer<typeof FirstLearnUpdateSchema>;
/**
 * Częściowa aktualizacja danych nauki karty
 */
export declare const CardLearningUpdateSchema: z.ZodObject<{
    cardAlgo: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
    firstLearn: z.ZodOptional<z.ZodObject<{
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
    }>>;
    grade: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof CardGrade>>>;
    cardAlgoReverse: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
    firstLearnReverse: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
}, "strict", z.ZodTypeAny, {
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
    firstLearn?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}, {
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
    firstLearn?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}>;
export type CardLearningUpdate = z.infer<typeof CardLearningUpdateSchema>;
/**
 * Częściowa aktualizacja karty (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdAt
 */
export declare const CardUpdateSchema: z.ZodObject<{
    cardData: z.ZodOptional<z.ZodObject<{
        front: z.ZodString;
        back: z.ZodString;
        frontLower: z.ZodOptional<z.ZodString>;
        backLower: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }, {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
} & {
    cardAlgo: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
    firstLearn: z.ZodOptional<z.ZodObject<{
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
    }>>;
    grade: z.ZodOptional<z.ZodOptional<z.ZodNativeEnum<typeof CardGrade>>>;
    cardAlgoReverse: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
    firstLearnReverse: z.ZodOptional<z.ZodOptional<z.ZodObject<{
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
    }>>>;
}, "strict", z.ZodTypeAny, {
    tags?: string[] | undefined;
    cardData?: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    } | undefined;
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
    firstLearn?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        isNew: boolean;
        due?: Date | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}, {
    tags?: string[] | undefined;
    cardData?: {
        front: string;
        back: string;
        frontLower?: string | undefined;
        backLower?: string | undefined;
    } | undefined;
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
    firstLearn?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
    grade?: CardGrade | undefined;
    cardAlgoReverse?: {
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
    firstLearnReverse?: {
        due?: unknown;
        isNew?: boolean | undefined;
        isFirst?: boolean | undefined;
        consecutiveGood?: number | undefined;
    } | undefined;
}>;
export type CardUpdate = z.infer<typeof CardUpdateSchema>;
