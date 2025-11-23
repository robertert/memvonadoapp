"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardChangeWithTypeSchema = void 0;
const zod_1 = require("zod");
/**
 * Zmiana karty (z typem)
 */
exports.CardChangeWithTypeSchema = zod_1.z
    .object({
    cardId: zod_1.z.string(),
    type: zod_1.z.enum(["modified", "deleted", "new"]),
    changes: zod_1.z
        .array(zod_1.z.object({
        field: zod_1.z.string(),
        oldValue: zod_1.z.any(),
        newValue: zod_1.z.any(),
    }))
        .optional(),
})
    .strict();
