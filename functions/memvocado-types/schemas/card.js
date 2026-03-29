"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardUpdateSchema = exports.CardLearningUpdateSchema = exports.FirstLearnUpdateSchema = exports.CardAlgoUpdateSchema = exports.CardCoreUpdateSchema = exports.CardDataUpdateSchema = exports.CardSchema = exports.CardMetaSchema = exports.CardLearningSchema = exports.CardTimestampSchema = exports.FirstLearnSchema = exports.CardAlgoSchema = exports.CardCoreSchema = exports.CardDataSchema = exports.CardGrade = void 0;
const zod_1 = require("zod");
const base_1 = require("./base");
/**
 * Reprezentacja numerycznych ocen przechowywanych w bazie.
 * Ułatwia czytanie kodu, jednocześnie zachowując kompatybilność z danymi.
 */
var CardGrade;
(function (CardGrade) {
    /**
     * Karta nie została jeszcze oceniona.
     */
    CardGrade[CardGrade["NotGraded"] = -1] = "NotGraded";
    /**
     * Zła odpowiedź.
     */
    CardGrade[CardGrade["Wrong"] = 0] = "Wrong";
    /**
     * Trudna odpowiedź.
     */
    CardGrade[CardGrade["Hard"] = 1] = "Hard";
    /**
     * Dobra odpowiedź.
     */
    CardGrade[CardGrade["Good"] = 2] = "Good";
    /**
     * Łatwa odpowiedź.
     */
    CardGrade[CardGrade["Easy"] = 3] = "Easy";
})(CardGrade || (exports.CardGrade = CardGrade = {}));
/**
 * Podstawowe dane karty (edytowalne w formularzu)
 */
const _CardDataBaseSchema = zod_1.z.object({
    front: zod_1.z.string(),
    back: zod_1.z.string(),
    frontLower: zod_1.z.string().optional(),
    backLower: zod_1.z.string().optional(),
});
exports.CardDataSchema = _CardDataBaseSchema.transform((data) => ({
    front: data.front,
    back: data.back,
    frontLower: data.front.trim().toLowerCase(),
    backLower: data.back.trim().toLowerCase(),
}));
exports.CardCoreSchema = zod_1.z
    .object({
    cardData: _CardDataBaseSchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
})
    .strict();
/**
 * Algorytm FSRS (Free Spaced Repetition Scheduler)
 */
exports.CardAlgoSchema = zod_1.z
    .object({
    difficulty: zod_1.z.number(),
    scheduled_days: zod_1.z.number(),
    due: base_1.TimestampSchema,
    last_review: base_1.TimestampSchema.optional(),
    reps: zod_1.z.number().min(0),
    state: zod_1.z.number(),
    stability: zod_1.z.number(),
    elapsed_days: zod_1.z.number(),
    lapses: zod_1.z.number(),
})
    .strict();
/**
 * First Learning - dane dla pierwszej nauki karty
 */
exports.FirstLearnSchema = zod_1.z
    .object({
    isNew: zod_1.z.boolean().default(true), // Card never seen
    isFirst: zod_1.z.boolean().optional(), // Card is in first learning phase
    due: base_1.TimestampSchema.optional(),
    consecutiveGood: zod_1.z.number().min(0).optional(), // Number of consecutive good answers
})
    .strict();
/**
 * Timestampy karty
 */
exports.CardTimestampSchema = zod_1.z
    .object({
    createdAt: base_1.TimestampSchema,
})
    .strict();
/**
 * Dane nauki/oceny karty
 */
exports.CardLearningSchema = zod_1.z
    .object({
    cardAlgo: exports.CardAlgoSchema.optional(),
    firstLearn: exports.FirstLearnSchema,
    grade: zod_1.z.nativeEnum(CardGrade).optional(), // -1: not graded, 0: wrong, 1: hard, 2: good, 3: easy
    cardAlgoReverse: exports.CardAlgoSchema.optional(),
    firstLearnReverse: exports.FirstLearnSchema.optional(),
})
    .strict();
/**
 * Meta karty
 */
exports.CardMetaSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    hasChanges: zod_1.z.boolean().optional(),
    updatedAt: base_1.TimestampSchema.optional(),
})
    .strict();
/**
 * Pełna karta
 */
exports.CardSchema = exports.CardCoreSchema.merge(exports.CardLearningSchema)
    .merge(exports.CardTimestampSchema)
    .merge(exports.CardMetaSchema);
////////////////////////////////////////////////////////////
// Partial schematy dla update'ów (częściowe aktualizacje)
////////////////////////////////////////////////////////////
/**
 * Częściowa aktualizacja danych karty (tylko cardData)
 */
exports.CardDataUpdateSchema = _CardDataBaseSchema.partial();
/**
 * Częściowa aktualizacja core karty
 */
exports.CardCoreUpdateSchema = exports.CardCoreSchema.partial().strict();
/**
 * Częściowa aktualizacja algorytmu karty
 */
exports.CardAlgoUpdateSchema = exports.CardAlgoSchema.partial().strict();
/**
 * Częściowa aktualizacja firstLearn
 */
exports.FirstLearnUpdateSchema = exports.FirstLearnSchema.partial().strict();
/**
 * Częściowa aktualizacja danych nauki karty
 */
exports.CardLearningUpdateSchema = exports.CardLearningSchema.partial().strict();
/**
 * Częściowa aktualizacja karty (tylko pola edytowalne)
 * Nie można aktualizować pól systemowych jak id, createdAt
 */
exports.CardUpdateSchema = exports.CardCoreUpdateSchema.merge(exports.CardLearningUpdateSchema).strict();
